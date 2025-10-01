---
title: Appendix 4 - Reading from Flash
draft: false
tags:
  -
---
Before settling on the final [[7 - Reading from Configuration File|solution]] for reading from a configuration file, I had experimented with loading a binary file onto the Pico W's internal flash via OpenOCD/pyOCD's flash commands, and then reading its contents using C's memory functions. 

![[Pasted image 20251001105453.png|300]]

While I didn't end up using this method in the project, it was still a very educational process that made me learn more about linker scripts, map files, flash storage and automation methods for pyOCD/OpenOCD. Here are my notes on the subject.
# Picking an Address To Load To
The first question to ask is: where to load the config file? My first thought was to load the configuration file after the program code. So I needed to find out where, in memory, does the program end?
![[Pasted image 20251001094429.png|300]]

This information could only be known during the linking stage of the build process. The default **linker script** **"memmap_default.ld"** used in the build process can  be found in **"{Pico SDK folder}/src/rp2_common/pico_crt0/rp2040/"**. 

The linker script defines the different sections of the program on memory. Here's a visual representation of the last few sections:

![[Pasted image 20251001095548.png|200]]

The final section is named  `.flash_end`, which presumably denotes the end of the program. Here's how it's defined in the linker script: 

```
.flash_end : {
        KEEP(*(.embedded_end_block*))
        PROVIDE(__flash_binary_end = .);
} > FLASH
```

To find out the actual address of `.flash_end`, I can refer to the linker map file (mine was called **"blink.elf.map"**) that is generated when my program is built. It's only generated if you specified `pico_add_extra_outputs({app_name})` in **"CMakeLists.txt"**.

Searching for references to `.flash_end` in **"blink.elf.map"**, I found the following:

```
.flash_end      0x000000001004a970        0x0
```

Where **"0x1004A970"** is the section address and **"0x0"** is its size.

So I thought I'd just load my config file **directly** after the program code, at the exact address of `.flash_end`. 

But that turned out to be a big mistake.

The Pico W's flash storage is divided into multiple **sectors**, which are each 4 KB large. A sector is the smallest unit in flash that can be modified. So if you want to write some data to an address, the sector containing that address will be completely erased before the new data is written to it.

If I loaded the config file directly after the program code, the last section of my program would be erased! 

![[Pasted image 20251001105035.png]]

I only found out my mistake much later when I tried implementing this solution. After I loaded the config file onto flash and restarted the program, the startup routine `crt0` would trigger a [hard fault](https://community.st.com/t5/stm32-mcus/how-to-debug-a-hardfault-on-an-arm-cortex-m-stm32/ta-p/672235#toc-hId-956277377) interrupt. Presumably, it crashed after trying to jump into my code, because the code was incomplete.

The solution was simply to load the config file into the next flash sector following the program code. 

![[Pasted image 20251001105135.png|250]]

Knowing that a sector is 4 KB large, the formula to calculate the address of the next flash sector would be: 

$$\textrm{4 KB}\times\textrm{rounded up value of }(\frac{\textrm{.flash\_end}}{\textrm{4 KB}})$$

For example, if `.flash_end` was located at **"0x1004A970"**, the correct address to write to would be **"0x1004B000"**.
# Loading The Binary File Using pyOCD
First, I created a file named **"config"**:
```shellscript
sudo nano config
```
containing a random string of text: "Male bovine excrement"
## Automated Python Script
Since pyOCD comes with a Python API, I could write a Python script to automate the process of loading the config file. I saved the Python script in my build folder, so it could access the linker map file generated during the build process.

First, the Python script parses the linker map file (**"blink.elf.map"**) to extract the program's end address in flash, and then calculates the start address of the next flash sector:
```python
import math

with open(r'blink.elf.map', 'r') as fp:
	lines = fp.readlines()
	for row in lines:
		# Search for section named ".flash_end"
		word = '.flash_end'  
		if row.find(word) != -1:
			# Extract the address, which is the second word in the line
			end_addr = row.split()[1]
			# Calculate start address of the next flash sector
			address = 4096 * math.ceil(int(end_addr,16)/4096)
```

Once the script knows where it needs to load the file to, it can call in the pyOCD API to start the loading process:

```python
from pyocd.core.helpers import ConnectHelper
from pyocd.flash.file_programmer import FileProgrammer

# Create a pyOCD debug session, targetting rp2040 processor	
session = ConnectHelper.session_with_chosen_probe(options={"target_override": "rp2040"})

# Start the session
with session:
	board = session.board
	target = board.target
	
	# Load the file "config" to the address that was caluclated earlier
	FileProgrammer(session).program("config", file_format="bin", base_address=address)
	
	target.reset()
```

So every time I make a change to the config file, I can run this Python script to update the flash content.
## Manual Loading using pyOCD commands
First, start a GDB server (in the same folder as the **"config"** file):
```shellscript
pyocd gdbserver -t rp2040 --persist --allow-remote
```

Then in a different terminal window (but still in the same folder), run `gdb-multiarch` and type in the command `target remote localhost:3333` to connect to the GDB server.

I can now use flash commands to load my "config" file onto the Pico W. (All pyOCD commands need to be prefixed with the `monitor` keyword.)

I'll load it to the address **"0x1004B000"**, which I identified as the start address of the sector following the program's end:

```shellscript
monitor loadmem 0x1004B000 config
```

Note that pyOCD always erases a flash sector before writing to it (unlike OpenOCD), so there's no need to worry about any issues with overwriting.

Then to verify the transfer worked, I read back the flash content starting from **"0x1004B000"**:

```shellscript
monitor read8 0x1004B000 40
```
(This reads back 40 bytes of data, in 8-bit units)

Here's the output of pyOCD (with ASCII translations):
```
1004a970: 4d 61 6c 65 20 62 6f 76 69 6e 65 20 65 78 63 72 
|Male bovine excr|
1004a980: 65 6d 65 6e 74 2e 0a ff ff ff ff ff ff ff ff ff    |ement...........|
1004a990: ff ff ff ff ff ff ff ff                             
|........|
```

This confirms that my config file was successfully copied over.
# Reading the Config File from C Program
I now want my program to read the data in the configuration file. But in order to calculate the address of the config file, the program needs to know its own end address before it's even been compiled! This is where **linker symbols** come into play.

Looking back at how the section `.flash_end` is defined in the linker script, we can see that the address of `.flash_end`  has been saved in a linker symbol named `__flash_binary_end`.:

```
.flash_end : {
        KEEP(*(.embedded_end_block*))
        PROVIDE(__flash_binary_end = .);
} > FLASH
```

> [!faq]- The Location Counter
> In a linker script, any references to `.` is referring to the **location counter**, which is incremented as the linker travels down the memory as it copies in data from the input files. Basically, it tells us which address we are currently at during every step of linking. 

Linker symbols can be accessed by a C program using the `extern` keyword. Therefore, with `__flash_binary_end` the program could know its own end address at runtime, and then use it to calculate the address of the config file:

```c
#define SECTOR_SIZE 0x1000 // 4096 bytes / 4 KB

extern char __flash_binary_end;

int main(){
	stdio_init_all();
	char myData[256];
	
	//Convert end address from char to int
	int end_of_flash = (uintptr_t)&__flash_binary_end;
	//Calculate start address of next sector
	int write_addr = SECTOR_SIZE * ((end_of_flash/SECTOR_SIZE) + 1);
	
	//Read data from config file
	printf("Reading from %p\n", (const uint8_t*)write_addr);
	memcpy(&myData, (const uint8_t*)write_addr, 256);
	printf("Read data: %s\n", myData);
}
```

And the output on minicom is:

```
Reading from 1000F000                                            
Read data: Male bovine excrement                                 
����������������������������������������������������������������
```

There are garbage characters at the end because the program reads 256 characters, which is more than what I typed in the file.

# (Bonus ) Using OpenOCD
While OpenOCD has similar flash commands to pyOCD, there are some slight differences.
## **Loading config file to flash**
Unlike pyOCD, OpenOCD does not automatically erase a flash sector before writing to it. Therefore, we need to erase the sector we're writing to manually with the following command:

```shellscript
monitor flash erase_address 0x1004B000 4096
```
(If the address being erased is not the start address of a flash sector, then the `pad` keyword must be added after `erase_address`. This will erase the entire sector that the specified address belongs to, ignoring the last parameter of the command which is the number of bytes to be erased.)

Then we can write our config file to flash:
```shellscript
monitor flash write_bank 0 config 0x4B000
```
(Instead of asking for the target address, OpenOCD asks for the **offset** of the target address from the start of flash, which can be found via `flash list`. OpenOCD also requires an additional parameter: the flash bank number. Since the Pico W only has one flash bank, we can just put `0`. A complete list of the flash banks can be shown by running `flash list`).

**Reading flash content**
```shellscript
monitor flash mdb 0x1004a970 20
```
Output:
```
0x1004a970: 4d 61 6c 65 20 62 6f 76 69 6e 65 20 65 78 63 72 65 6d 65 6e 74 2e 0a ff ff ff ff ff ff ff 
```

## **Automating The Process Using OpenOCD Tcl scripts**
Similar to pyOCD, OpenOCD also supports the use of scripts to automate operations. In OpenOCD's case, we need to provide a Tcl script. I'll use a Python script to generate it.

Same as last time, the script first parses the linker map file and calculates the target address to write to: 
```python
with open(r'blink.elf.map', 'r') as fp:
	lines = fp.readlines()
	for row in lines:
		# Search for section named ".flash_end"
		word = '.flash_end'  
		if row.find(word) != -1:
			# Extract the address, which is the second word in the line
			end_addr = row.split()[1]
			# Calculate start address of the next flash sector
			address = 4096 * math.ceil(int(end_addr,16)/4096)
```

Then, it generates a Tcl script named "test.tcl", which will load the config file to the address that was just calculated:

```python
import math

f =  open(r'test.tcl', 'w')
f.write("init\nreset init\n")
f.write("flash erase_address " + hex(address) + " 4096\n")
f.write("flash write_bank 0 config " + hex(offset) + "\n")
f.write("reset init\n")
f.write("exit")

```

So, after using Python to generate the Tcl script, I can load it into OpenOCD via:
```shellscript
openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg -c "adapter speed 5000" -f test.tcl 
```

Or, if running from GDB:
```shellscript
(gdb) monitor source test.tcl
```

OpenOCD will then carry out all the commands in the Tcl script (i.e. load the file onto flash)

# References
- [(Blog Post) Everything You Never Wanted to Know About Linker Scripts](https://mcyoung.xyz/2021/06/01/linker-script/)
- [(Blog Post) Get the most out of the linker map file](https://interrupt.memfault.com/blog/get-the-most-out-of-the-linker-map-file)

- [(Documentation) pyOCD Python API examples](https://pyocd.io/docs/api_examples.html)

- [(Tutorial)How to search for a string in text file using Python](https://www.geeksforgeeks.org/python/python-how-to-search-for-a-string-in-text-files/)
- [(Documentation) OpenOCD Tcl crash course](https://openocd.org/doc/html/Tcl-Crash-Course.html#source-and-find-commands) 

# Extra Notes
- *When writing the Python script for calling pyOCD, I kept getting an `ModuleNotFound` error and it was because I named my Python script "pyocd.py", the same name as the package I was trying to import! Changing it "pyocd_test.py" fixed the issue.*