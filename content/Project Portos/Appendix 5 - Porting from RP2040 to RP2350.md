---
title: Appendix 5 - Porting from RP2040 to RP2350
draft: false
tags:
  -
---
 Towards the end of development, I was asked to port the project from the Pico W to the Pico 2W. The process was very simple.

# Changing Build Configurations
First, I modified the first line of "CMakeLists.txt" from:
```
set(PICO_BOARD pico_w)
```
to
```
set(PICO_BOARD pico2_w)
```

Then in "FreeRTOSConfig.h" I added the following lines[^1]:
```
#define configENABLE_FPU                        0
#define configENABLE_MPU                        0
#define configENABLE_TRUSTZONE                  0
#define configRUN_FREERTOS_SECURE_ONLY 0
#define configMAX_SYSCALL_INTERRUPT_PRIORITY    1
```

# Pull-Down Resistor Bug

But then an issue arose when I was testing the [[3 - GPIO Button Input|GPIO button inputs]]. The program wasn't responding to the button presses! Eventually, I used a Logic Analyzer to monitor the GPIO signal. 

I found that once I pressed the button, the GPIO signal would go from LOW to HIGH. But then it wouldn't come back down once I released the button!

I looked up the issue, and found that this is actually a bug[^2] in the RP2350 pull-down resistor circuitry. Apparently, the RP2350 can't pull down a signal back to LOW once it's been pulled HIGH. 

I confirmed this by using a voltmeter to measure the voltage on the GPIO pin. When I pressed the button, it would go up to 3.3 V. Once I released, it would go down...to 2.4 V. Which is still registered as a HIGH signal. 

The solution was to modify the GPIO signal to be HIGH by default, so pressing the button would pull down the signal to LOW. The program can then detect button presses by triggering an interrupt on the **rising edge** of a signal change (i.e. when the button is released).

This is accomplished by pulling the GPIO pin high at startup:
```c
gpio_pull_up(BUTTON_1);
gpio_set_irq_enabled_with_callback(BUTTON_1, GPIO_IRQ_EDGE_FALL, 1, &vGPIOCallback);
```

And then wiring the buttons so that one end is connected to the GPIO pin, and the other end is connected to ground. 

# Further Notes
[^1]: Defining `configMAX_SYSCALL_INTERRUPT_PRIORITY` lower than 1 leads to the whole system hanging once the scheduler starts

[^2]: A great video describing the bug and possible workarounds: https://www.youtube.com/watch?v=sqJQNF9snaE
