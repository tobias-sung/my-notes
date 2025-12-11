---
title: 10 - SD Card Debug Logger
draft: false
tags:
  -
---
I built a simple debug logging feature to help keep a record of what's going on when the system is running. Debug logs are saved to a text file stored on an SD card, connected to the Pico W via an SPI card reader.

During development, I've been using simple "print" statements to output messages via UART, which I can read using a serial communication program like [minicom](https://wiki.emacinc.com/wiki/Getting_Started_With_Minicom). This is useful for debugging during development, when I'm only running the program for short periods of time. But in real-life operation, the program would be running for hours and a lot could go wrong. Therefore, it would be useful to have a **permanent, timestamped record** of what happened during operation in the event that it suddenly crashes.
# Overview
Here's a brief overview of how the feature works.

![[SD Card Debug Logger.png]]

1. **User calls `debug_print()`**
   - Message is formatted using `vsprintf()`
   - Timestamp is prepended to the debug message using `rtc_get_timestamp_string()`

2. **Dual output**
   - **Output 1:** The message is outputted via PIO UART to any GPIO pin of your choosing
   - **Output 2:** The message is added to a **Queue**, and the **Task** responsible for writing to the SD card is notified.

3. **Write to SD Card**
- The SD Card Write Task writes every single message in the Queue to a text file on the SD Card.

4. **Result**
   - Real-time debug output visible on serial monitor (like minicom)
   - Persistent log file on SD card for post-analysis
## Using a Queue to Store Messages
I decided to use a **[Queue](https://freertos.org/Documentation/02-Kernel/02-Kernel-features/02-Queues-mutexes-and-semaphores/01-Queues)** to store messages temporarily before they are written to the SD card. This solved two problems.

The first problem was that the **[driver](https://github.com/carlk3/FreeRTOS-FAT-CLI-for-RPi-Pico)** I was using to interface with the SD card reader was written in such a way that the initialization of the SD Card reader must be called from insde a Task. 

**This means that until the Task Scheduler is started, nothing can be written to the SD card**. There's a lot of important initialization work happening before the Task Scheduler begins, and any good debug log would be incomplete without recording those jobs.

With a Queue, I could temporarily store those debug messages printed during startup. Then, when the SD Card Task starts, it can empty the queue and write all the messages to the text file, before beginning its forever loop where it waits to be notified of any new messages in the Queue.

![[Pasted image 20251210121236.png]]

The second problem was that multiple Tasks would try and print debug messages at the same time. What ended up happening was that one Task might print out a part of its message, but then it gets interrupted when the RTOS switches to another Task which prints out a part of its message, but then it gets interrupted and...

So if Task 1 wants to print "This is my debug message". And Task 2 wants to print "EVERYTHING'S GOING WRONG!!!". You'd get something like:
```
This is myEVERYTHING'S GOING debug messageWRONG!!!
```








