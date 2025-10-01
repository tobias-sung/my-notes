---
title: Write-Up Appendix 5 - Understanding Linker Map
draft: true
tags:
  -
---
**Work in progress** 

In order to understand the linker map file, I had to first understand what exactly the linker does.

In order to transform source code into an executable file, it needs to pass through what is called a toolchain. Most toolchains consist of 3 tools:
1. The compiler, which converts the source code (.c) into assembly code (.s) that is unique to the architecture of the target hardware. Assembly files are human readable and can be written by humans. 
2. The assembler, which converts the assembly code (.s) into an object file (.o) that is not human readable,
3. The linker, which takes all the object files generated and combines them into an executable file.

The linker is most useful in cases when a program involves multiple source code files and depends on a large number of libraries.
# Sections
An object file is split into multiple **sections** with standard names like `.text` (containing compiled program code), `.data` (containing global variables with initial values), `.rodata` (containing constant variables) and `.bss` (containing uninitialized variables). 

The linker refers to a **linker script** in order to determine how to arrange these sections onto the hardware's memory. 

In a linker script, we first define the various sections of the code:
```cpp
SECTIONS {
  /* Define an output section ".text". */
  .text : {
    /* Pull in all symbols in input sections named .text */
    *(.text)
    /* Do the same for sections starting with .text.,
       such as .text.foo */
    *(.text.*)
  }

  /* Do the same for ".bss", ".rodata", and ".data". */
  .bss : { *(.bss); *(.bss.*) }
  .data : { *(.data); *(.data.*) }
  .rodata : { *(.rodata); *(.rodata.*) }
}
```

Every section has 3 associated addresses: (1) file offset (how far is it from the start of the file) (2) virtual memory address (where the section can be found at runtime) (3) load memory address (where the code should be placed by the loader, usually the same as VMA).

When declaring a new section, both the VMA and the LMA are set to the **location counter**. The location counter automatically increments as data is copied from the inputs. Think of the location counter as the **current address**. This is represented in the linker script as a simple `.`. (So, if you want to save the address of a certain step in the linking process, you could save it to a variable with `__variable := .`)

# Memory Regions
While linkers will allocate sections starting from memory address 0, **memory regions** can be defined to more finely control where sections are allocated to.

For example, here are the memory regions defined in the Pico's default linker script:
```
MEMORY
{
    INCLUDE "pico_flash_region.ld"
    RAM(rwx) : ORIGIN =  0x20000000, LENGTH = 512k
    SCRATCH_X(rwx) : ORIGIN = 0x20080000, LENGTH = 4k
    SCRATCH_Y(rwx) : ORIGIN = 0x20081000, LENGTH = 4k
}
```

"pico_flash_reigon.ld":
```
FLASH(rx) : ORIGIN = 0x10000000, LENGTH = (2 * 1024 * 1024)
```

The parentheses contains attributes of a memory region which decides what sections can be allocated to it. For example, the section ".rodata" is read-only, and since all of the memory regions have "r" in its attributes it could be allocated to any of them.

The linker can pick the best memory region for each section based on attributes, but we can manually specify which memory region each section should be allocated to using the `>` operator. For example:
```cpp
.text {
	/*section content*/
} > FLASH
```

# References
- [Everything You Didn't Want To Know About Linker Scripts](https://mcyoung.xyz/2021/06/01/linker-script/)
- 