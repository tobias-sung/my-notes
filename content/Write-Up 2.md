---
title: Write-Up 2
draft: false
tags:
---
# Part 2 - Setting Up the Raspberry Pi Debug Probe for Debugging and Flashing

Before writing more complex programs, it's helpful to set up the Raspberry Pi Debug Probe with our Pico W. This will allow us to have more debug options as well as load our program without having to keep reconnecting the Pico W.

## Connecting the Debug Probe to the Pico W
The Debug Probe comes with 3 debug cables. Take the 3-pin debug to 3-pin debug cable and connect the "D" port on the probe to the debug connector on the Pico W (it's located in the middle of the board). Then take the 3-pin debug to male cable and connect the "U" port of the probe to the RX (orange), GND (black) and TX (yellow) pins on the Pico W.

## Installing OpenOCD
Although installing OpenOCD on Ubuntu can be as simple as running `sudo apt-get install openocd`, building from source can help us identify any dependency issues during installation.

```Shell
git clone https://github.com/raspberrypi/openocd.git
cd openocd
./bootstrap
./configure  --disable-werror
make -j4
sudo make install
```

### Installation Issues (optional)
When I initially installed OpenOCD the simple way using `apt-get`, I kept getting this error after running `sudo openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg -c "adapter speed 5000"`: 

```
Error: The specified debug interface was not found (cmsis-dap)
The following debug adapters are available:
1: jlink
```

So I tried building from source, but after running the `./configure` step, I got the following output: 
```
OpenOCD configuration summary
--------------------------------------------------
MPSSE mode of FTDI based devices        no
ST-Link Programmer                      no
TI ICDI JTAG Programmer                 no
Keil ULINK JTAG Programmer              no
Altera USB-Blaster II Compatible        no
Bitbang mode of FT232R based devices    no
Versaloon-Link JTAG Programmer          no
TI XDS110 Debug Probe                   no
CMSIS-DAP v2 Compliant Debugger         no
OSBDM (JTAG only) Programmer            no
eStick/opendous JTAG Programmer         no
Olimex ARM-JTAG-EW Programmer           no
Raisonance RLink JTAG Programmer        no
USBProg JTAG Programmer                 no
Espressif JTAG Programmer               no
Andes JTAG Programmer (deprecated)      no
CMSIS-DAP Compliant Debugger            no
Nu-Link Programmer                      no
Cypress KitProg Programmer              no
Altera USB-Blaster Compatible           no
ASIX Presto Adapter                     no
OpenJTAG Adapter                        no
Linux GPIO bitbang through libgpiod     no
SEGGER J-Link Programmer                yes (auto)
Bus Pirate                              no
Use Capstone disassembly framework      no
```

The CMSIS-DAP debugger wasn't being enabled. In fact, none of the debug adpters were being enabled. I tried running `./configure` again except with the following flag:

```Shell
./configure --enable-cmsis-dap
```

This time, the `./configure` process failed and told me I was missing the [HIDAPI](https://github.com/libusb/hidapi) package. But checking Synaptic Package Manager I already had `libhidapi-dev` installed. 

After some digging (especially thanks to this [post](https://stackoverflow.com/questions/55945023/libudev-development-package-not-found) on Stack Overflow) I realized the problem wasn't that the packages weren't installed correctly, but that somehow the build process couldn't detect that they were installed. The problem was with `pkg-config`, a tool that is used by the build process to retrieve information about installed libraries. 

Running `pkg-config --list-all` revealed that many libraries were not being detected by `pkg-config`. Running `pkg-config validate libhidapi` returned the following:
```
Package libhidapi was not found in the pkg-config search path.

Perhaps you should add the directory containing `libhidapi.pc'
to the PKG_CONFIG_PATH environment variable

No package 'libhidapi' found
```

After some digging, I found that all the relevant `.pc` files were located in `/usr/lib/x86_64-linx-gnu/pkgconfig`. So simply changing the environment variable `PKG_CONFIG_PATH`:

```Shell
export $PKG_CONFIG_PATH /usr/lib/x86_64-linux-gnu/pkgconfig
```

finally allowed me to successfully build OpenOCD with all the relevant debuggers enabled.

To test if OpenOCD is working, we can `cd` into the "build" folder of our "blink" project directory and run:
```Shell
sudo openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg -c "adapter speed 5000" -c "program blink.elf verify reset exit"
```

If all goes well, we should get several lines of debug information ending with:

```Shell
** Programming Started **  
Warn : Function FUNC_BOOTROM_STATE_RESET not found in RP2xxx ROM. (probably an RP2040 or an RP2350 A0)  
Warn : Function FUNC_FLASH_RESET_ADDRESS_TRANS not found in RP2xxx ROM. (probably an RP2040 or an RP2350 A0)  
Info : RP2040 Flash Probe: 33554432 bytes @0x10000000, in 8192 sectors  
  
Info : Padding image section 1 at 0x10005224 with 220 bytes (bank write end alignment)  
Warn : Adding extra erase range, 0x10005300 .. 0x10005fff  
** Programming Finished **  
** Verify Started **  
** Verified OK **  
** Resetting Target **  
shutdown command invoked
```

## Installing and Running GDB
Since we're debugging the Pico W from a Ubuntu machine, we need to install `gdb-multiarch` which will allow us to debug the Pico W's ARM architecture:

```Shell
sudo apt-get install gdb-multiarch
```

To start a debug session, first start an OpenOCD server:
```Shell
sudo openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg -c "adapter speed 5000"
```

Then in a separete terminal window:
```Shell
gdb-multiarch blink.elf
```

Then, once GDB is running enter the following commands:
```
target remote localhost:3333
monitor reset init
continue
```

Note that all commands after the `monitor` keyword are [OpenOCD commands](https://openocd.org/doc/html/General-Commands.html). So any time we want to run an OpenOCD command from GDB, we have to prefix it with the `monitor` keyword.

Now that we've got our debug setup working, we can start implementing our code.

# References
- [Raspberry Pi Debug Probe Documentation](https://www.raspberrypi.com/documentation/microcontrollers/debug-probe.html)