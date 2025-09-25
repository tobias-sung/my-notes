**Work in progress** 

Before settling on the final [[Write-Up 7 - Reading from Configuration File|solution]] for reading from a configuration file, I had experimented with loading a binary file onto the Pico W's internal flash via OpenOCD/pyOCD's flash commands, and then reading its contents using C's memory functions. 
# Picking an Address To Load To
The first question to ask is: where to load the config file? The simplest solution would be to load the configuration file right after the program code. So I needed to find out where, in memory, does the program end?

This information could only be known during the linking stage of the build process. The default linker script "memmap_default.ld" used in the build process can  be found in "pico-sdk/src/rp2_common/pico_crt0/rp2040/". In the list of sections defined by the linker script, the very last one is named `.flash_end`, which presumably denotes the end of the program: 

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

Where "0x1004a970" is the address and "0x0" is the size of the section.
# Loading The Binary File
First, I created a file named "config" with some text inside:
```shellscript
sudo nano config
```

Then I created a GDB server in OpenOCD/pyOCD:
**OpenOCD**
```shellscript
sudo openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg -c "adapter speed 5000"
```
**pyOCD**
```shellscript
pyocd gdbserver -t rp2040 --persist --allow-remote
```

Then in a different terminal window, run `gdb-multiarch` (in the same directory as the "config" file I just created) and type in the command `target remote localhost:3333` to connect to the GDB server.

I can now use flash commands to load my "config" file onto the Pico W. I'll load it to the address `0x1004a970`, which I identified as where my program ends in flash:
**OpenOCD**
```shellscript
monitor flash write_bank 0 config 0x4a970
```
**pyOCD**
```shellscript
monitor loadmem 0x1004a970 config
```

Then to verify the transfer worked, I read back the memory content in units of 32-bit words starting from `0x1004a970`:
**OpenOCD**
(Address is `0x1004a970`, number of 32-bit words to be read is `10`)
```shellscript
monitor flash mdw 0x1004a970 10
```
**pyOCD**
(Address is `0x1004a970`, length of bytes to be read is `40` which must be a multiple of 4)
```shellscript
monitor read32 0x1004a970 40
```

Here's the output of pyOCD (OpenOCD has a similar output, but it doesn't provide the ASCII conversion present on the rightmost column):
```
10070000:  6c6c6548 53202c6f 65766574 74202c6e    |lleHS ,oevett ,n|  
10070010:  20736968 43207369 206d656c 646e6146    | sihC si meldnaF|  
10070020:  6f676e61 6143202e                      |ognaaC .|
```

This confirms that my config file was successfully copied over (although the converted text looks wrong because the hexadecimal digits were translated left-to-right instead of right-to-left).
# Getting The Prorgam to Read The Binary File
I now want my program to read the data in the configuration file, located after the end of the program in flash. But how can the program know where it ends before it's even been compiled and linked? Looking back at how the section `.flash_end` is defined in the linker script:

```
.flash_end : {
        KEEP(*(.embedded_end_block*))
        PROVIDE(__flash_binary_end = .);
} > FLASH
```

> [!faq] The Location Counter
> In a linker script, any references to `.` is referring to the **location counter**, which is incremented as the linker travels down the memory as it copies in data from the input files. Basically, it tells us which address we are currently at during every step of linking. 

We can see that the address of `.flash_end`  has been saved in a linker symbol named `__flash_binary_end`.

Linker symbols can be accessed by our program code simply using the `extern` keyword. So I could tell my program to read from this address with the following code:
```C
extern char __flash_binary_end;

int main(){
	stdio_init_all();
	char myData[256];
	printf("Reading from %p\n", &__flash_binary_end);
	memcpy(&myData, &__flash_binary_end, 256);
	printf("Read data: %s\n", myData);
}
```

And the output on minicom is:
![[Pasted image 20250925111915.png]]

There are garbage characters at the end because the program reads 256 characters, which is more than what I typed in the file.

If I ever want to update the config file, I'll first have to erase the previous one with:
**OpenOCD**
```shellscript
monitor flash erase_address pad 0x10070000 256
```
(256 refers to the number of bytes to be erased starting from address 0x10070000. If the start address does not align with the start of a flash sector, then the "pad" keyword is needed which will delete the entire sector which "0x10070000" belongs to)
**pyOCD**
```shellscript
monitor erase 0x10070000 1
```
(1 refers to the number of sectors to be erased. The sector to be erased is inferred from the address provided.)

Once the sector that contained the old config file has been erased, I can upload a new one.



