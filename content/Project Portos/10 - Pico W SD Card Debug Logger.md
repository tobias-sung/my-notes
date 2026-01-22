---
title: 10 - Pico W SD Card Debug Logger
draft: false
tags:
  -
---
[GitHub code](https://github.com/tobias-sung/picow-freertos-sd-logger)

I built a simple debug logging feature to help keep a record of what's going on when the system is running. Debug logs are saved to a text file stored on an SD card, connected to the Pico W via an SPI card reader.

During development, I've been using simple "print" statements to output messages via UART, which I can read using a serial communication program like [minicom](https://wiki.emacinc.com/wiki/Getting_Started_With_Minicom). This is useful for debugging during development, when I'm only running the program for short periods of time. But in real-life operation, the program would be running for hours and a lot could go wrong. Therefore, it would be useful to have a **permanent, timestamped record** of what happened during operation in the event that it suddenly crashes.
# Overview
Here's a brief overview of how the feature works.

![[SD Card Debug Logger.png]]

1. **`debug_print()` gets called**
   - A mutex is acquired
   - Message is formatted using `vsprintf()`
   - Timestamp is prepended to the debug message using `rtc_get_timestamp_string()`

2. **Dual output**
   - **Output 1:** The message is outputted via PIO UART to any GPIO pin of your choosing
   - **Output 2:** The message is added to a **Queue**, and the **Task** responsible for writing to the SD card is notified.
   - Afterwards, the mutex acquired earlier is released.

3. **Write to SD Card**
- The SD Card Write Task writes every single message in the Queue to a text file on the SD Card.

4. **Result**
   - Real-time debug output visible on serial monitor (like minicom)
   - Persistent log file on SD card for post-analysis

In the next sections, I explain some issues I ran into and how I solved them.
## Using a Queue to Store Messages
I decided to use a **[Queue](https://freertos.org/Documentation/02-Kernel/02-Kernel-features/02-Queues-mutexes-and-semaphores/01-Queues)** to store messages temporarily before they are written to the SD card, because of an issue with writing debug logs that occur before the FreeRTOS task scheudler is started.

The **[driver](https://github.com/carlk3/FreeRTOS-FAT-CLI-for-RPi-Pico)** I was using to interface with the SD card reader was written in such a way that the initialization function of the SD Card reader must be called from insde a Task. 

**This means that until the Task Scheduler is started, nothing can be written to the SD card**. There's a lot of important initialization work happening before the Task Scheduler begins, and any good debug log would be incomplete without recording those jobs.

With a Queue, I could temporarily store those debug messages printed during startup. Then, when the SD Card Task starts, it can empty the queue and write all the messages to the text file, before beginning its forever loop where it waits to be notified of any new messages in the Queue.

![[SD Card Queue.png]]

## Using a Mutex to protect `debug_print()`
Another crucial feature was using a mutex to control access to the `debug_print()` function.

Since this is a FreeRTOS program with multiple tasks running, it's inevitable that more than one task would try and print debug messages at the same time. 

If Task 1 wants to print "This is my debug message", and Task 2 wants to print "EVERYTHING'S GOING WRONG!!!", then you might get the following output:
```
This is myEVERYTHING'S GOING debug messageWRONG!!!
```

With both tasks interrupting each other before they can finish printing out the entire message. This would make the logs very confusing and difficult to parse. Therefore, a mutex is necessary to make sure a Task can only call `debug_print()` once the current Task has finished using it.

After initializing the mutex with `debug_mutex = xSemaphoreCreateMutex();`, I could then wrap all the code inside `debug_print()` as follows:

```c
void debug_print(const char* fmt, ...){
    xSemaphoreTake(debug_mutex, portMAX_DELAY);
	//Print debug message to PIO UART output
	//Add debug message to queue
	//Notify SD Card Task
    xSemaphoreGive(debug_mutex);
}
```

It wasn't necessary to protect the SD Card write operations, since the [driver](https://github.com/carlk3/FreeRTOS-FAT-CLI-for-RPi-Pico) already includes its own mutex for protecting writes.













