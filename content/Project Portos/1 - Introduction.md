---
title: 1 - Introduction
draft: false
tags:
  -
---
*[View the full code on GitHub](https://github.com/tobias-sung/picow-race-timer)*

This documents the process of working on a FreeRTOS framework for connecting a Raspberry Pi Pico W to multiple hardware periperhals and a server (which it sends data to periodically), written in C. I worked on this as part of a very fruitful internship, and since I've gotten permission to make parts of the project open-source, that means I can do a detailed write-up of all the work I did.

The project started off as a simple task to port some MicroPython code (used for time-tracking in a car race) to FreeRTOS, which is why I informally dubbed it "Project Portos". Eventually, the framework was reworked to be used in a people-counting system, in which the Pico would be hooked up to a distance sensor and count the number of people in the vicinity.

The following diagram provides a brief overview of all the different hardware peripherals that were connected to the Pico during the project's development (note that some of the connections were removed towards the end of development, such as when the radar was replaced with a distance sensor):

![[Project Portos Overview Final.png]]


I've detailed most of the development process in the following articles:

1. Initial Learning - Developing a [[2 - UART Communication|UART console]] for entering text commands 
2. Initial Learning - Connecting [[3 - GPIO Button Input|push buttons]] via GPIO 
3. Implementing [[4 - TCP Client|TCP client functionality]] for connecting to a TCP server 
4. Implementing [[5 - HTTPS Client|TLS client functionality]] for connecting to an HTTPS server with Transport Layer Security.
5. Connecting a [[6 - OLED screen|small OLED screen]] via I<sup>2</sup>for printing out messages
6. Modifying configuration options via a [[7 - Configuration File|text file in internal flash]] (used TinyUSB to turn the Pico into a Mass Storage Class USB device).  
7. Display [[8 - Battery Display on the Pico W|power status]] on OLED screen
8. Outputting debug logs to an [[10 - Pico W SD Card Debug Logger|SD card]] connected via SPI 
9. Modifying the [[9 - Modifying VL535CX Driver to Use Software I2C (PIO)|distance sensor driver]] to use a software-simulated I<sup>2</sup>C connection

For clarity, I've separated each feature into its own project, with the GitHub link provided at the start of each article. 

In addition, I kept a few miscellaneous notes on issues I encountered during the development, which I've categorized as appendices:
1. [[Appendix  1  - Set-Up and Building Simple "Blink" Program|Learning how to set up a basic FreeRTOS "blink" program]]
2. [[Appendix 2 - Raspberry Pi Debug Probe|Setting up the Raspberry Pi Debug Probe for loading and debugging programs]]
3. [[Appendix 3 - UART Debug Output|Re-routing debug messages to free up UART 0]]
4. [[Appendix 4 - Reading from Flash|Loading files onto Pico's internal flash using the Debug Probe and OpenOCD]]
5. [[Appendix 5 - Porting from RP2040 to RP2350|Porting from RP2040 (Pico W) to RP2350 (Pico 2W)]]
