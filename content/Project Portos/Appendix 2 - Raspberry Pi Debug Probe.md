---
title: Appendix 2 - Raspberry Pi Debug Probe
draft: false
tags:
---
These are notes on how I set up the Raspberry Pi Debug Probe with the Pico W. Using the Debug Probe allowed me to get a closer look at what was going wrong during crashes and made it much more convenient to reload programs onto the Pico W. 

# Connecting the Debug Probe to the Pico W
The Debug Probe comes with 3 debug cables. Take the 3-pin debug to 3-pin debug cable and connect the "D" port on the probe to the debug connector on the Pico W (it's located in the middle of the board). Then take the 3-pin debug to male cable and connect the "U" port of the probe to the RX (orange), GND (black) and TX (yellow) pins on the Pico W.

![[20250924_175412.jpg|250]] 

# Installing pyOCD
pyOCD is a simple-to-install tool that bridges the host computer with the debug interface (i.e. the debug probe).  
 
 I followed the [installation instructions](https://pyocd.io/docs/installing.html) and installed it with:
```shellscript
python3 -m pip install -U pyocd
```

I then checked if pyOCD could detect my debug probe by using the command `pyocd list`. But the response I got was: `No available debug probes are connected`

After some trial and error, I realized it had to do with pyOCD not having permission to access the debug probe. 
## Configuring udev
pyOCD's documentation strongly discouraged running it as a root user or using `sudo` as this could cause issues, recommending that users configure their computer's "udev" rules instead.

> [!faq] "udev" Rules
> "udev" is a system on Linux that manages USB devices. "udev" rules (which are written in ".rules" files stored in  the "/etc/udev/rules.d" directory) tell the system what to do when it detects that a specific USB device has been connected. 

Following the format of these [example "udev" rule files](https://github.com/pyocd/pyOCD/tree/main/udev) provided by pyOCD, I created a file called "50-pi-debug-probe.rules":
```shellscript
sudo nano /etc/udev/rules.d/50-pi-debug-probe.rules
```

The number prefix of the ".rules" file determines its priority (lower means higher). I chose 50 because the example "udev" rule files used this number.

I then wrote the following rule:
```
# 2e8a:000c Raspberry Pi Debug Probe CMSIS_DAP
SUBSYSTEM=="usb", ATTR{idVendor}=="2e8a", ATTR{idProduct}=="000c", MODE:="666"
```

What this rule tells the "udev" system is this: When you see a device in the USB subsystem with a vendor ID "2e8a" and product ID "000c, set its access mode to 666 (which grants full access to all users).

In order to find out the vendor ID and product ID of the debug probe, I used the `lsusb` command to display information about the debug probe:

```
Bus 001 Device 047: ID 2e8a:000c Raspberry Pi Debug Probe (CMSIS-DAP)
```

That's how I found that the debug probe's vendor ID is "2e8a", and its product ID is "000c".

To enforce the new udev rule without having to reboot, I ran:
```shellscript
sudo udevadm control --reload-rules && sudo udevadm trigger
```

Once I re-plugged the debug probe, it finally showed up when I ran `pyocd list`:
```
  #   Probe/Board                            Unique ID          Target  
------------------------------------------------------------------------
  0   Raspberry Pi Debug Probe (CMSIS-DAP)   E6616407E3225229   n/a     

```

# Starting a GDB Server and Debugging
To start a GDB server, I `cd`'d into the build folder of my project directory and ran:
```shellscript
pyocd gdbserver -t rp2040 --persist --allow-remote
```

Then, in a separate terminal window (but in the same folder) I started gdb (I'm using `gdb-multiarch`, since I'm debugging a Pi program from a non-Pi system):
```shellscript
gdb-multiarch blink.elf
```

Once gdb was started, I could connect to the GDB server I had started earlier and then start entering PyOCD Commands:
```shellscript
> (gdb) target remote localhost:3333
> (gdb) monitor reset
> (gdb) monitor continue
```

All PyOCD commands must be prefaced with the "monitor" keyword. A full list of PyOCD commands can be found [here](https://pyocd.io/docs/command_reference.html). 

To start with, I'd like to load my program executable ("blink.elf") onto the Pico W (this is only possible if the pyOCD GDB server was started in the build folder):
```shellscript
> (gdb) monitor load blink.elf
> (gdb) monitor reset
```

# (Bonus) Installing OpenOCD
Before using pyOCD, I followed the instructions of the official [Raspberry Pi debug probe documentation](https://www.raspberrypi.com/documentation/microcontrollers/debug-probe.html) and used OpenOCD to interface with the debug probe instead. I eventually switched to pyOCD because it was easier to setup. I include my notes on getting OpenOCD up and running here just for future reference.

Although installing OpenOCD on Ubuntu can be as simple as running `sudo apt-get install openocd`, building from source helped me identify dependency issuess during installation (which I write about in more detail later). Here are the commands:
```shellscript
git clone https://github.com/raspberrypi/openocd.git
cd openocd
./bootstrap
./configure  --disable-werror
make -j4
sudo make install
```

To test if OpenOCD is working, I `cd`'d into the "build" folder of the "blink" project directory and ran the following command to load "blink.elf" onto the Pico W:
```shellscript
openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg -c "adapter speed 5000" -c "program blink.elf verify reset exit"
```

I got several lines of output, which ended with:
```
** Programming Finished **  
** Verify Started **  
** Verified OK **  
** Resetting Target **  
shutdown command invoked
```

Which confirms that OpenOCD is up and running.
## Starting a GDB Server and Debugging
In the "build" folder of the project directory, run:
```shellscript
openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg -c "adapter speed 5000"
```

Then in a seperate terminal window, in the same folder, run:
```shellscript
gdb-multiarch blink.elf
```

With GDB running, I can connect to the GDB server I started earlier and start entering OpenOCD commands:
```shellscript
> (gdb) target remote localhost:3333
> (gdb) monitor reset init
> (gdb) continue
```

All commands after the `monitor` keyword are [OpenOCD commands](https://openocd.org/doc/html/General-Commands.html), which are slightly different from [pyOCD commands](https://pyocd.io/docs/command_reference.html). 
## OpenOCD Installation Issues 
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

```shellscript
./configure --enable-cmsis-dap
```

This time, the `./configure` process failed and told me I was missing the [HIDAPI](https://github.com/libusb/hidapi) package. But checking Synaptic Package Manager I already had `libhidapi-dev` installed. 

After some digging (especially thanks to this [post](https://stackoverflow.com/questions/55945023/libudev-development-package-not-found) on Stack Overflow) I realized the problem wasn't that the packages weren't installed correctly. The real problem was that **the build process couldn't detect that the dependencies were installed**. 

The build process uses a tool called `pkg-config` to retrieve information about installed libraries. Running `pkg-config --list-all` revealed that many libraries were not being detected by `pkg-config`. Running `pkg-config validate libhidapi` returned the following:
```
Package libhidapi was not found in the pkg-config search path.

Perhaps you should add the directory containing `libhidapi.pc'
to the PKG_CONFIG_PATH environment variable

No package 'libhidapi' found
```

After some digging, I found that all the relevant `.pc` files were located in `/usr/lib/x86_64-linx-gnu/pkgconfig`. So I changed the environment variable `PKG_CONFIG_PATH` accordingly:

```shellscript
export $PKG_CONFIG_PATH /usr/lib/x86_64-linux-gnu/pkgconfig
```

This finally allowed me to successfully build OpenOCD with all the relevant debuggers enabled.

# References
- [Raspberry Pi Debug Probe Documentation](https://www.raspberrypi.com/documentation/microcontrollers/debug-probe.html)
- [PyOCD Documentation - Installation](https://pyocd.io/docs/installing.html)
- [PyOCD Documentation - Debug Probes](https://pyocd.io/docs/debug_probes.html)
- [(Blog Post) Using Raspberry Pi and MCU Link for Remote Embedded Debugging](https://mcuoneclipse.com/2025/07/03/using-raspberry-pi-and-mcu-link-for-remote-embedded-debugging/)
- [(Blog Post) Effortless Debugging with Your Pico Probe: No more Sudo!](https://www.robmiles.com/journal/2024/1/18/effortless-debugging-with-your-pico-probe-no-more-sudo)
