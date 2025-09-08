# Part 1 - Setting Up Development Environment and Building A Simple "Blink" Program

This project was developed on Ubuntu 22.04.5 LTS.
## Downloading Tools
First, we'll install some essential tools needed for building our embedded C programs.

```Shell
sudo apt install cmake
sudo apt install gcc-arm-none-eabi //Compiling C code for ARM
sudo apt install build-essential //Make
```

Then we need to install the Pico SDK and FreeRTOS kernel. I'll downloaded them in my home directory because I might use them for other projects, not just this one.

```Shell
git clone https://github.com/RaspberryPi/pico-sdk --recurse-submodules
git clone -b smp https://github.com/FreeRTOS/FreeRTOS-Kernel --recurse-submodules
```

Remember to save the path you downloaded these libraries to in the correct environment variable. CMake will check for these paths during build process. For me, that's:

```Shell
export PICO_SDK_PATH=home/tobias/pico-sdk
export FREERTOS_KERNEL_PATH=home/tobias/FreeRTOS-Kernel
```

## Writing Simple Blink Program
We'll create a new project directory for our simple project called "blink". Naturally our program will simply blink the on-board LED in a forever loop. 

Once inside the directory, we'll need 3 files:
- A "main.c" file containing our code
- A "CMakeLists.txt" file that contains a sequence of instructions for CMake
- A "FreeRTOSConfig.h" file that contains settings for FreeRTOS

Let's complete the "main.c" file first.

First, we'll include the necessary header files.

```C
#include "pico/stdlib.h" 
#include "FreeRTOS.h"
#include "task.h" 
```

Then we'll create a simple Task that blinks an LED in a forever loop. 

```C
void vBlinkTask() {
   for (;;) {
      gpio_put(PICO_DEFAULT_LED_PIN, 1);
      vTaskDelay(250);
      gpio_put(PICO_DEFAULT_LED_PIN, 0);
      vTaskDelay(250);
   }
}
```

Finally, we have our main function which initializes everything, creates the task and then starts the scheduler which is in charge of deciding which task to run. Since we only have one task, it will just keep running that task by default.

```C
void main() {
   gpio_init(PICO_DEFAULT_LED_PIN);
   gpio_set_dir(PICO_DEFAULT_LED_PIN, GPIO_OUT);
   xTaskCreate(vBlinkTask, "Blink Task", 128, NULL, 1, NULL);
   vTaskStartScheduler();
}
```

If we take a closer look at [`xTaskCreate()`](https://www.freertos.org/Documentation/02-Kernel/04-API-references/01-Task-creation/01-xTaskCreate), we can examine the various parameters:
- `vBlinkTask`: This is a pointer to the function that implements the task, which we created just now.
- `"Blink Task"`: A name for the task that is mainly used for debugging
- `128`: The number of words to allocate for the the task's stack. Since the Pico W is a 32-bit system, this means we have $\frac{128 \times 32}{8} =$ 512 bytes
- `NULL`: This parameter contains a variable that we wish to pass to our created task. Since we have no need of this (for now), we just set it to NULL.
- `1`: This is the priority at which our created task will execute. Since there's only one task running, we can just set it to 1 without too much thought.
- `NULL`: This specifies a Task Handle to be assigned to the created task. We have no need of this, so we just set it to NULL.

For the "CMakeLists.txt" and "FreeRTOSConfig.h" files, I just adapted the samples from this [example](https://github.com/aws-iot-builder-tools/freertos-pi-pico/tree/main/app):
CMakeLists.txt:
```
cmake_minimum_required(VERSION 3.13)

set(PICO_BOARD pico_w)

# Pull in SDK (must be before project)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)

# Pull in FreeRTOS
include($ENV{FREERTOS_KERNEL_PATH}/portable/ThirdParty/GCC/RP2040/FreeRTOS_Kernel_import.cmake)

project(app C CXX ASM)

set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)

# Initialize the SDK
pico_sdk_init()

add_executable(blink main.c)

target_include_directories(blink PRIVATE ${CMAKE_CURRENT_LIST_DIR})

# pull in common dependencies
target_link_libraries(blink 
	pico_stdlib 
	FreeRTOS-Kernel 
	FreeRTOS-Kernel-Heap4
)  

# create map/bin/hex/uf2 file etc.
pico_add_extra_outputs(blink)
```

FreeRTOSConfig.h:
```
/*
 * FreeRTOS V202107.00
 * Copyright (C) 2020 Amazon.com, Inc. or its affiliates.  All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * http://www.FreeRTOS.org
 * http://aws.amazon.com/freertos
 *
 * 1 tab == 4 spaces!
 */

#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H

/*-----------------------------------------------------------
 * Application specific definitions.
 *
 * These definitions should be adjusted for your particular hardware and
 * application requirements.
 *
 * THESE PARAMETERS ARE DESCRIBED WITHIN THE 'CONFIGURATION' SECTION OF THE
 * FreeRTOS API DOCUMENTATION AVAILABLE ON THE FreeRTOS.org WEB SITE.
 *
 * See http://www.freertos.org/a00110.html
 *----------------------------------------------------------*/

/* Scheduler Related */
#define configUSE_PREEMPTION                    1
#define configUSE_TICKLESS_IDLE                 0
#define configUSE_IDLE_HOOK                     0
#define configUSE_TICK_HOOK                     0
#define configTICK_RATE_HZ                      ( ( TickType_t ) 1000 )
#define configMAX_PRIORITIES                    32
#define configMINIMAL_STACK_SIZE                ( configSTACK_DEPTH_TYPE ) 256
#define configUSE_16_BIT_TICKS                  0

#define configIDLE_SHOULD_YIELD                 1

/* Synchronization Related */
#define configUSE_MUTEXES                       1
#define configUSE_RECURSIVE_MUTEXES             1
#define configUSE_APPLICATION_TASK_TAG          0
#define configUSE_COUNTING_SEMAPHORES           1
#define configQUEUE_REGISTRY_SIZE               8
#define configUSE_QUEUE_SETS                    1
#define configUSE_TIME_SLICING                  1
#define configUSE_NEWLIB_REENTRANT              0
#define configENABLE_BACKWARD_COMPATIBILITY     0
#define configNUM_THREAD_LOCAL_STORAGE_POINTERS 5

/* System */
#define configSTACK_DEPTH_TYPE                  uint32_t
#define configMESSAGE_BUFFER_LENGTH_TYPE        size_t

/* Memory allocation related definitions. */
#define configSUPPORT_STATIC_ALLOCATION         0
#define configSUPPORT_DYNAMIC_ALLOCATION        1
#define configTOTAL_HEAP_SIZE                   (128*1024)
#define configAPPLICATION_ALLOCATED_HEAP        0

/* Hook function related definitions. */
#define configCHECK_FOR_STACK_OVERFLOW          0
#define configUSE_MALLOC_FAILED_HOOK            0
#define configUSE_DAEMON_TASK_STARTUP_HOOK      0

/* Run time and task stats gathering related definitions. */
#define configGENERATE_RUN_TIME_STATS           0
#define configUSE_TRACE_FACILITY                1
#define configUSE_STATS_FORMATTING_FUNCTIONS    0

/* Co-routine related definitions. */
#define configUSE_CO_ROUTINES                   0
#define configMAX_CO_ROUTINE_PRIORITIES         1

/* Software timer related definitions. */
#define configUSE_TIMERS                        1
#define configTIMER_TASK_PRIORITY               ( configMAX_PRIORITIES - 1 )
#define configTIMER_QUEUE_LENGTH                10
#define configTIMER_TASK_STACK_DEPTH            1024

/* Interrupt nesting behaviour configuration. */
/*
#define configKERNEL_INTERRUPT_PRIORITY         [dependent of processor]
#define configMAX_SYSCALL_INTERRUPT_PRIORITY    [dependent on processor and application]
#define configMAX_API_CALL_INTERRUPT_PRIORITY   [dependent on processor and application]
*/

/* SMP port only */
#define configNUM_CORES                         2
#define configTICK_CORE                         0
#define configRUN_MULTIPLE_PRIORITIES           1
#define configUSE_CORE_AFFINITY                 1

/* RP2040 specific */
#define configSUPPORT_PICO_SYNC_INTEROP         1
#define configSUPPORT_PICO_TIME_INTEROP         1

#include <assert.h>
/* Define to trap errors during development. */
#define configASSERT(x)                         assert(x)

/* Set the following definitions to 1 to include the API function, or zero
to exclude the API function. */
#define INCLUDE_vTaskPrioritySet                1
#define INCLUDE_uxTaskPriorityGet               1
#define INCLUDE_vTaskDelete                     1
#define INCLUDE_vTaskSuspend                    1
#define INCLUDE_vTaskDelayUntil                 1
#define INCLUDE_vTaskDelay                      1
#define INCLUDE_xTaskGetSchedulerState          1
#define INCLUDE_xTaskGetCurrentTaskHandle       1
#define INCLUDE_uxTaskGetStackHighWaterMark     1
#define INCLUDE_xTaskGetIdleTaskHandle          1
#define INCLUDE_eTaskGetState                   1
#define INCLUDE_xTimerPendFunctionCall          1
#define INCLUDE_xTaskAbortDelay                 1
#define INCLUDE_xTaskGetHandle                  1
#define INCLUDE_xTaskResumeFromISR              1
#define INCLUDE_xQueueGetMutexHolder            1

/* A header file that defines trace macro can be included here. */

#endif /* FREERTOS_CONFIG_H */
```


While we can mostly leave the "FreeRTOSConfig.h" alone, it can be helpful to understand the structure of "CMakeLists.txt" since we'll be modifying it more frequently as we add more features and complexity. Getting our program to build successfully requires getting our "CmakeLists.txt" in order and a lot of frustration can be saved by understanding how it works.

### Understanding "CMakeLists.txt" (optional)
(Learn more about CMake [here](https://cmake.org/cmake/help/latest/guide/tutorial/A%20Basic%20Starting%20Point.html))

First, we indicate the minimum version of CMake required.
```
cmake_minimum_required(VERSION 3.13)
```
****
Then we set the CMake variable `PICO_BOARD` to `pico_w` since I'm using a Pico W. Skipping this will cause the build process to assume I'm using a regular Pico which will cause issues later on when we start using libraries specific to the Pico W. 
```
set(PICO_BOARD pico_w)
```
For some reason, setting this variable after pulling in the Pico SDK (which we'll do next) is ineffective and CMake will not detect that it was set, defaulting to the base Pico (you can read more about this issue in this [forum post](https://forums.raspberrypi.com/viewtopic.php?t=376508)).
****
Then, we indicate where the Pico SDK is located (remember we set an environment variable `PICO_SDK_PATH` earlier):
```
# Pull in SDK (must be before project)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
```
****
Then the same for the FreeRTOS Kernel (we stored the path in environment variable `FREERTOS_KERNEL_PATH`):
```
# Pull in FreeRTOS
include($ENV{FREERTOS_KERNEL_PATH}/portable/ThirdParty/GCC/RP2040/FreeRTOS_Kernel_import.cmake)
```
****
Then we'll define our project name ("blink") as well as which programming languages are needed to build the project (C, CXX which refers to C++ and ASM which refers to assembly):
```
project(blink C CXX ASM)
```
****
Then we set the value of CMake variables `CMAKE_C_STANDARD` and `CMAKE_CXX_STANDARD` (in this case we use C11 and C++17 standards to build the project):
```
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)
```
****
Then we'll call `pico_sdk_init()`, a function that was included when we pulled in the Pico SDK at the beginning (this has to be called after the project was defined):
```
pico_sdk_init()
```
(Although this is just one line of code, it actually does a lot of things and will run a lot of CMake commands to set things up for the final build process. More on this later when we get to linking libraries.)
****
Then we specify the name of our executable file ("blink") and the source files it will be built from (just "main.c" for now, but we'll add more source files later once we split our project into multiple files):
```
add_executable(blink main.c)
```

(The name of our executable will be used frequently in the following commands, so make it short and snappy.)
****
Then we specify the include directories (that is, which directories contain header files that we include in our code):
```
target_include_directories(blink PRIVATE ${CMAKE_CURRENT_LIST_DIR})
```
Since our project is really simple and only has one header file `FreeRTOSConfig.h` in the project directory, we can just set our include directory to be our project directory. Since our project directory contains `CMakeLists.txt`, we can just use the CMake variable `CMAKE_CURRENT_LIST_DIR` (the directory containing `CMakeLists.txt`). We set the scope to be PRIVATE, meaning that these include directories apply only to our target executable "blink" (although it doesn't really matter since we're only building a single target, more on that [here](https://leimao.github.io/blog/CMake-Public-Private-Interface/)).
****
Then we'll specify which libraries should be used during the linking stage:
```
# pull in common dependencies
target_link_libraries(blink pico_stdlib FreeRTOS-Kernel FreeRTOS-Kernel-Heap4)
```

If you're wondering why we're using specific labels like `pico_stdlib` or `FreeRTOS-Kernel` rather than providing a specific filepath, you can think of it like this. When we called `pico_sdk_init()` earlier, it created several library "packages" (known as [library targets](https://cmake.org/cmake/help/book/mastering-cmake/chapter/Key%20Concepts.html#targets) in CMake terms) by grouping together the relevant source files and gave each of these packages a simple label (like `pico_stdlib` or `FreeRTOS-Kernel`). These library targets are created by invoking the CMake command [`add_library()`](https://cmake.org/cmake/help/latest/command/add_library.html#command:add_library).

For example, you can find the following code in `{FreeRTOS Kernel Directory}/portable/ThirdParty/GCC/RP2040/library.cmake`:

```
add_library(FreeRTOS-Kernel INTERFACE)

target_sources(FreeRTOS-Kernel INTERFACE
        ${CMAKE_CURRENT_LIST_DIR}/port.c
)
target_include_directories(FreeRTOS-Kernel INTERFACE
        ${CMAKE_CURRENT_LIST_DIR}/include
        ${FREERTOS_CONFIG_FILE_DIRECTORY})
target_link_libraries(FreeRTOS-Kernel INTERFACE
        FreeRTOS-Kernel-Core
        pico_base_headers
        hardware_clocks
        hardware_exception
        pico_multicore
)
target_compile_definitions(FreeRTOS-Kernel INTERFACE
        LIB_FREERTOS_KERNEL=1
        FREE_RTOS_KERNEL_SMP=1
)
```

All of these source files and information gets wrapped under the simple label of "FreeRTOS-Kernel".
****
Normally, we can stop here and start the build process which produce an executable file `blink.elf`. But if we want to produce additional outputs, like `uf2`, `bin`, `hex` and `map` files, then we can add this command (also from the Pico SDK):
```
pico_add_extra_outputs(blink)
```
****
In case you want to get a really detailed look at how CMake processes each line of "CMakeLists.txt", when you're building the program you can run `cmake --trace-expand source_dir > trace.txt 2>&1` which will ouput a verbose debug log to "trace.txt".

### Building the Program
Create a folder called "build" in the project directory, then run CMake before finally running the Makefile generated by CMake:
```Shell
mkdir build
cd build

cmake ..
make
```

## Loading Program onto Pico
The simple (but rather frustrating) way of loading a program onto the Pico is to hold down the BOOTSEL button while plugging in the Micro-USB cable of the Pico into your computer. A storage device named RPI should show up on your computer's file system, after which you can just drag and drop "blink.uf2" onto the drive. The Pico should then reboot by itself and start blinking its LED.

Alternatively, you can follow this great [tutorial video](https://www.youtube.com/watch?v=tRXLxrtfU_s) on how to use "picotool" to load programs without having to replug the Pico.

# References
- Using FreeRTOS with the Raspberry Pi Pico - [Part 1](https://embeddedcomputing.com/technology/open-source/linux-freertos-related/using-freertos-with-the-raspberry-pi-pico)
- [CMake Documentation](https://cmake.org/cmake/help/latest/index.html)
