---
title: Resume Draft
draft: false
tags:
  -
---
 # Skills 專長
## Programming Languages
- C/C++
- Python/MicroPython
- Shell script
## Debuggers
- Software: GDB
- Hardware: Raspberry Pi Debug Probe, XDS110 Debug Probe
## Microprocessors
- Raspberry Pi Pico W/2W
- Texas Instruments CC1312R 
## Embedded Operating Systems
- Embedded Linux
- TI-RTOS/FreeRTOS
## Embedded Software Development Tools
- OpenOCD
- UniFlash
- PulseView (Logic Analyzer GUI)
## Development Environments
- IDE: Visual Studio Code, Code Composer
- Toolchains: GCC, CLang
## Project Management
- Git
- GitHub, GitLab, BitBucket
# Projects 專案成就
## NB-IoT Water Meter Data Loader
- Developed a Python script that downloads the data of more than 8000 NB-IoT water meter devices from OneNET API, which is then organized and loaded into an Elasticsearch index
- Due to limits on how much data could be downloaded in a single API call, large jobs would be split into multiple API calls using recursion
- Due to the large amount of data that had to be downloaded and processed, multi-threading (using the `concurrent.futures` Python module) was implemented such that multiple downloads could happen simulatenously.
## TI-RTOS Boot Image Manager
- Implemented a boot image manager that loads and runs a firmware image on a Texas Instruments CC1312R MCU running TI-RTOS.
- Identified a bug where the image header contained an invalid image length, which prevented the boot image manager from loading the firmware image:
- Wrote a function for generating a factory image
## Raspberry Pi Z2W: Wake-Up via Real-Time Clock 
- Implemented and tested a design for a fish farm monitoring system that would be woken up at certain intervals to collect sensor data
- Used a Raspberry Pi Zero 2W for the main system, DS3231 I2C clock for the real-time clock and a Raspberry Pi Pico for waking the Zero 2W.
- The Pi Zero 2W sets an alarm on the RTC before going to sleep. When the alarm on the RTC goes off, it sends a signal to a Pico, which sends a signal to the Zero 2W to wake it up.
- Used Shellscript for interfacing with the RTC from the Pi Zero 2W, and MicroPython for the Pico wake-up program 
## Raspberry Pi Pico W: FreeRTOS Time-Tracking System
- Implemented a system for tracking the completion times of different tracks during a race
- Split various features into FreeRTOS tasks to enable multi-tasking
- Used FreeRTOS' "Direct-to-Task notification" system for inter-task communication
- Used the Pico's TinyUSB hardware abstraction library to implement reading configuration settings from a text file easily accessible by USB connection
# References
## Original resume
![[Resume.svg]]
