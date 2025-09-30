**Work in progress** 

Before settling on the final [[Write-Up 7 - Reading from Configuration File|solution]] for reading from a configuration file, I had experimented with loading a binary file onto the Pico W's internal flash via OpenOCD/pyOCD's flash commands, and then reading its contents using C's memory functions. 
# Picking an Address To Load To
The first question to ask is: where to load the config file? My first thought was to load the configuration file after the program code. So I needed to find out where, in memory, does the program end?

This information could only be known during the linking stage of the build process. The default **linker script** "memmap_default.ld" used in the build process can  be found in "pico-sdk/src/rp2_common/pico_crt0/rp2040/". 

The linker script defines the different sections of the program on memory. The final section is named  `.flash_end`, which presumably denotes the end of the program: 

```
.flash_end : {
        KEEP(*(.embedded_end_block*))
        PROVIDE(__flash_binary_end = .);
} > FLASH
```

To find out the actual address of `.flash_end`, I can refer to the linker map file (mine was called "blink.elf.map") that is generated when my program is built. It's only generated if you specified `pico_add_extra_outputs(blink)` in "CMakeLists.txt".

Searching for references to `.flash_end` in "blink.elf.map", I found the following address:

```
.flash_end      0x000000001004a970        0x0
```

Where "0x1004A970" is the address and "0x0" is the size of the section.

So I thought I'd just load my config file **directly** after the program code, at the exact address of `.flash_end`. But that turned out to be a big mistake.

The Pico W's flash storage is divided into multiple sectors, which are each 4 KB large. A sector is the smallest unit in flash that can be modified. So if you want to write some data to an address, the sector containing that address will be completely erased before the new data is written to it.

By loading my config file directly after the program code, I was trying to write data into a flash sector that was not empty. Not only that, but it contained the last section of my program code! 

So when I loaded the config file, the write operation would first erase the last section of the program code. Which is why, when I restarted the program after loading the config file, the startup routine `crt0` would trigger a [hard fault](https://community.st.com/t5/stm32-mcus/how-to-debug-a-hardfault-on-an-arm-cortex-m-stm32/ta-p/672235#toc-hId-956277377) interrupt. Presumably, it crashed after trying to jump into my code, because the code was incomplete.

The solution is to load the config file into the next flash sector following the program code. Knowing that a sector is 4 KB large, the formula to calculate the address of the next flash sector would be: 
$$\textrm{4 KB}\times\textrm{rounded up value of }(\frac{\textrm{end address of code}}{\textrm{4 KB}})$$

A while ago, I found that the section `.flash_end` was located at "0x1004A970". So the correct address to write to, using this formula, would be "0x1004B000".
# Loading The Binary File Using pyOCD
First, I created a file named "config":
```shellscript
sudo nano config
```
containing a random string of text: "Male bovine excrement"

Then I created a GDB server in pyOCD:

```shellscript
pyocd gdbserver -t rp2040 --persist --allow-remote
```

Then in a different terminal window, run `gdb-multiarch` (in the same directory as the "config" file I just created) and type in the command `target remote localhost:3333` to connect to the GDB server.

I can now use flash commands to load my "config" file onto the Pico W. Remember that in GDB, all pyOCD commands need to be prefixed with the `monitor` keyword.

I'll load it to the address "0x1004B000", which I identified as the start address of the sector following the program's end:

```shellscript
monitor loadmem 0x1004B000 config
```

Note that pyOCD always erases a flash sector before writing to it, so there's no need to worry about any issues with overwriting.

Then to verify the transfer worked, I read back the flash content starting from "0x1004B000":

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
I now want my program to read the data in the configuration file. But in order to calculate the address of the config file, the program needs to know its own end address before it's even been linked. This is where **linker symbols** come into play.

Looking back at how the section `.flash_end` is defined in the linker script:

```
.flash_end : {
        KEEP(*(.embedded_end_block*))
        PROVIDE(__flash_binary_end = .);
} > FLASH
```

> [!faq]- The Location Counter
> In a linker script, any references to `.` is referring to the **location counter**, which is incremented as the linker travels down the memory as it copies in data from the input files. Basically, it tells us which address we are currently at during every step of linking. 

We can see that the address of `.flash_end`  has been saved in a linker symbol named `__flash_binary_end`.

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
![[Pasted image 20250925111915.png]]

There are garbage characters at the end because the program reads 256 characters, which is more than what I typed in the file.


# (Bonus 1) Using OpenOCD
While OpenOCD has similar flash commands to pyOCD, there are some slight differences.

**Loading config file to flash**
Unlike pyOCD, OpenOCD does not automatically erase a flash sector before writing to it. Therefore, we need to erase the sector we're writing to manually with the following command:

```shellscript
monitor flash erase_address pad 0x1004a970 256
```
(The `pad` keyword is necessary because the address we're erasing from is likely not aligned with the start of a flash sector. The number of bytes to be erased doesn't matter, since it will always erase the entire sector no matter what.)

Then we can write our config file to flash:
```shellscript
monitor flash write_bank 0 config 0x4a970
```
(OpenOCD requires an additional parameter: the flash bank number. Since the Pico W only has one flash bank, we can just put `0`. A complete list of the flash banks can be shown by running `flash list`. Also, OpenOCD asks not for the exact address to be written to, just the offset from the start of flash. The start address can be found via `flash list`).

**Reading flash content**
```shellscript
monitor flash mdb 0x1004a970 20
```
Output:
```
0x1004a970: 4d 61 6c 65 20 62 6f 76 69 6e 65 20 65 78 63 72 65 6d 65 6e 74 2e 0a ff ff ff ff ff ff ff 
```

# (Bonus 2) Automating The Process Using OpenOCD Tcl scripts
I wrote a Python program to automate the process.

First, it parses the linker map file and calculates the correct address to load the config file to. 
```python
with open(r'blink.elf.map', 'r') as fp:
	lines = fp.readlines()
	for row in lines:
		word = '.flash_end'  # String to search for
		if row.find(word) != -1:
			#print('String exists in file')
			#print('Line Number:', lines.index(row))
			words = row.split()
			print("Address is " + words[1])
			print("Converting to int is", int(words[1],16))
			address = 4096 * math.ceil(int(words[1],16)/4096)
			offset =  address - 0x10000000
			print("Final address is", hex(address))
			print("Offset is", hex(offset))
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

So, in the terminal, only two commands are needed to load the file:
```shellscript
python3 write_addr.py

sudo openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg -c "adapter speed 5000" -f test.tcl 
```

Or, if running from GDB:
```shellscript
(gdb) monitor source test.tcl
```

- [How to search for a string in text file using Python](https://www.geeksforgeeks.org/python/python-how-to-search-for-a-string-in-text-files/)
- [OpenOCD Tcl crash course](https://openocd.org/doc/html/Tcl-Crash-Course.html#source-and-find-commands) 