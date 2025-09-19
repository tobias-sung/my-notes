---
title: Write-Up Appendix 2 - Debug Probe
draft: false
tags:
---
These are notes on how I set up the Raspberry Pi Debug Probe with the Pico W. Using the Debug Probe allowed me to get a closer look at what was going wrong during crashes and made it much more convenient to reload programs onto the Pico W. 

## Connecting the Debug Probe to the Pico W
The Debug Probe comes with 3 debug cables. Take the 3-pin debug to 3-pin debug cable and connect the "D" port on the probe to the debug connector on the Pico W (it's located in the middle of the board). Then take the 3-pin debug to male cable and connect the "U" port of the probe to the RX (orange), GND (black) and TX (yellow) pins on the Pico W.

## Installing OpenOCD
Although installing OpenOCD on Ubuntu can be as simple as running `sudo apt-get install openocd`, building from source helped me identify dependency issuess during installation (which I write about in more detail in the final "optional" part of this post).

```Shell
git clone https://github.com/raspberrypi/openocd.git
cd openocd
./bootstrap
./configure  --disable-werror
make -j4
sudo make install
```

To test if OpenOCD is working, I `cd`'d into the "build" folder of the "blink" project directory and ran the following command to load "blink.elf" onto the Pico W:
```Shell
sudo openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg -c "adapter speed 5000" -c "program blink.elf verify reset exit"
```

I got several lines of output ending with:

```Shell
** Programming Finished **  
** Verify Started **  
** Verified OK **  
** Resetting Target **  
shutdown command invoked
```

## Installing and Running GDB
OpenOCD is meant to run alongside GDB to provide debugging functionality.

Since I'm debugging the Pico W from an Ubuntu machine, I need to install `gdb-multiarch` which will allow us to debug the Pico W's ARM architecture:

```Shell
sudo apt-get install gdb-multiarch
```

To start a debug session, first start an OpenOCD server:
```Shell
sudo openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg -c "adapter speed 5000"
```

Then in a seperate terminal window, in the "build" folder of the project directory:
```Shell
gdb-multiarch blink.elf
```

Then, once GDB is running enter the following commands:
```
target remote localhost:3333
monitor reset init
continue
```

All commands after the `monitor` keyword are [OpenOCD commands](https://openocd.org/doc/html/General-Commands.html). So any time we want to run an OpenOCD command from GDB, we have to prefix it with the `monitor` keyword.

And that's the setup! But the process wasn't without issues, thanks to some weird system problems which I'll share in the next section, just in case other Ubuntu users somehow experience the same thing.
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

After some digging, I found that all the relevant `.pc` files were located in `/usr/lib/x86_64-linx-gnu/pkgconfig`. So I changed the environment variable `PKG_CONFIG_PATH` accordingly:

```Shell
export $PKG_CONFIG_PATH /usr/lib/x86_64-linux-gnu/pkgconfig
```

This finally allowed me to successfully build OpenOCD with all the relevant debuggers enabled.


# References
- [Raspberry Pi Debug Probe Documentation](https://www.raspberrypi.com/documentation/microcontrollers/debug-probe.html)