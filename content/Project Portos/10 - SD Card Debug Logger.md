---
title: 10 - SD Card Debug Logger
draft: false
tags:
  -
---
 

## Introduction

This tutorial explains how to build a **debug logging system** for the Raspberry Pi Pico W that:
- Captures debug messages using a custom print function
- Transmits messages via a **PIO-based UART TX interface** in real-time
- Simultaneously saves all messages to a **text file on an SD card**

This project combines FreeRTOS multitasking, PIO programming, and SD card file I/O to create a robust logging solution for embedded systems.

---

## Project Overview

### Key Components

1. **Custom PIO UART** (`debug_uart.pio`, `debug_uart.c`)
   - Uses the Pico's Programmable I/O (PIO) to implement a software UART transmitter
   - Allows debug output on any GPIO pin without using hardware UART resources

2. **Debug Print Function** (`debug_uart.c`)
   - Custom `debug_print()` function that formats and queues debug messages
   - Thread-safe using FreeRTOS queues and mutexes

3. **SD Card Interface** (`libraries/FreeRTOS+FAT+CLI/`)
   - Manages file I/O operations on the SD card
   - Uses FreeRTOS-FAT for file system abstraction
   - Runs on a separate FreeRTOS task

4. **Real-Time Clock** (`rtc.c`)
   - DS3231 I2C RTC for timestamping log entries

5. **Main Program** (`main.c`)
   - Initializes hardware and FreeRTOS tasks
   - Coordinates debug logging and SD card operations

---

## Code Structure and Function Overview

### `main.c` - Program Entry Point

**Purpose**: Initializes the system, sets up FreeRTOS tasks, and orchestrates the application.

**High-Level Functions**:
- `main()` - Initializes hardware (clocks, UART, I2C, SPI), creates FreeRTOS tasks, and starts the scheduler
- Creates tasks for:
  - Debug UART handling
  - SD card write operations
  - Other application-specific tasks

---

### `debug_uart.c` and `debug_uart.h` - Debug Output System

**Purpose**: Implements a custom print function that queues messages for both PIO UART transmission and SD card logging.

**High-Level Functions**:

- `debug_uart_init()` - Initializes the PIO UART hardware
  - Configures the PIO state machine
  - Sets up baud rate and GPIO pins
  - Creates a queue for debug messages

- `debug_print(const char *format, ...)` - Printf-style debug function
  - Formats messages using `vsprintf()`
  - Queues the formatted message for transmission
  - Thread-safe using mutexes

- `debug_uart_tx(char *msg)` - Transmits a single character via PIO UART
  - Sends one byte at a time to the PIO state machine

- `vDebugTask()` - FreeRTOS task that processes the debug queue
  - Reads messages from the queue
  - Sends them to the PIO UART
  - Also queues them for SD card writing

---

### `debug_uart.pio` - PIO Assembly Code

**Purpose**: Implements a UART transmitter using PIO assembly language.

**High-Level Operations**:
- Configures bit timing for a specific baud rate
- Shifts out data bits (start bit, 8 data bits, stop bit)
- Manages GPIO pin state during transmission

---

### `rtc.c` and `rtc.h` - Real-Time Clock

**Purpose**: Provides timestamped logging by interfacing with the DS3231 I2C RTC module.

**High-Level Functions**:

- `rtc_init()` - Initializes the DS3231 RTC over I2C
  - Sets up I2C communication
  - Configures the RTC with current time (if needed)

- `rtc_get_timestamp_string()` - Returns current date/time as a formatted string
  - Used to prepend timestamps to log entries

- `rtc_update_time(char *time_hex_str)` - Updates RTC with new time
  - Parses incoming time data and sets the RTC

---

### `hw_config.c` - Hardware Configuration

**Purpose**: Centralizes hardware setup for GPIO, I2C, SPI, and other peripherals.

**High-Level Functions**:

- `hw_config_init()` - Initializes all hardware interfaces
  - Configures GPIO pins for PIO UART TX
  - Sets up I2C for RTC communication
  - Configures SPI for SD card reader
  - Powers up the WiFi module (if needed)

---

### `globals.h` - Global Definitions

**Purpose**: Defines global variables and constants used across the project.

**Contents**:
- Extern declarations for FreeRTOS handles (task handles, queue handles, semaphores)
- Pin assignments for UART, I2C, SPI
- Configuration constants (baud rates, timeouts, etc.)

---

### `FreeRTOSConfig.h` - FreeRTOS Configuration

**Purpose**: Configures FreeRTOS kernel parameters.

**Key Settings**:
- `configTICK_RATE_HZ` - Scheduler tick frequency
- `configMAX_PRIORITIES` - Maximum number of task priorities
- `configMINIMAL_STACK_SIZE` - Minimum stack size for tasks

---

### `FreeRTOSFATConfig.h` - FreeRTOS-FAT Configuration

**Purpose**: Configures the FreeRTOS-FAT file system library.

**Key Settings**:
- Enables/disables features (file writes, directory support, etc.)
- Configures cache settings for SD card performance

---

## Data Flow Diagram

```
┌──────────────────────┐
│   debug_print()      │
│   (format message)   │
└──────────┬───────────┘
           │
           v
┌──────────────────────┐
│  Debug Message Queue │
└──────────┬───────────┘
           │
           ├─────────────────────┬─────────────────────┐
           v                     v                     v
    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
    │  PIO UART   │      │  SD Card    │      │   Display   │
    │     TX      │      │   Logger    │      │  (Optional) │
    └─────────────┘      └─────────────┘      └─────────────┘
```

---

## Workflow: How a Debug Message is Logged

1. **User calls `debug_print()`**
   - Message is formatted using `vsprintf()`
   - Timestamp is prepended using `rtc_get_timestamp_string()`

2. **Message is queued**
   - Stored in the debug message queue (thread-safe)
   - FreeRTOS task wakes up to process the queue

3. **Dual output**
   - **PIO UART TX**: Message is transmitted character-by-character via PIO
   - **SD Card**: Message is queued for file I/O on a separate SD card task

4. **SD Card write task**
   - Opens the log file (creates if it doesn't exist)
   - Appends the message to the file
   - Closes the file and returns to waiting state

5. **Result**
   - Real-time debug output visible on serial monitor
   - Persistent log file on SD card for post-analysis

---

## Building and Running

See `README.md` for detailed build and deployment instructions.

---

## Key Concepts

### PIO (Programmable I/O)
- Allows custom hardware protocols without using CPU cycles
- Perfect for UART, SPI, or other bit-banged protocols
- Runs independently from the main CPU

### FreeRTOS Queues
- Thread-safe message passing between tasks
- Prevents race conditions in multitasking environment

### SD Card File I/O
- Uses FreeRTOS-FAT abstraction layer
- Allows standard file operations (`fopen`, `fprintf`, `fclose`)
- Runs on separate task to avoid blocking main application

### Timestamping
- RTC provides accurate date/time information
- Each log entry is tagged with when it occurred
- Useful for debugging timing-related issues

---

## Tips for Extension

- **Add log levels** (DEBUG, INFO, WARNING, ERROR) with filtering
- **Implement circular buffer** to limit SD card writes
- **Add compression** for long logging sessions
- **Implement WiFi logging** to stream logs to a server
- **Add color-coded output** to serial terminal
