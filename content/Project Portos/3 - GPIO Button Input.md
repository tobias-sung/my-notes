---
title: 3 - GPIO Button Input
draft: true
tags:
---
*[View the full code on GitHub](https://github.com/tobias-sung/picow_freertos_gpio_button)*

Similar to the previous [[2 - UART Communication|section]], I want to communicate with the Pico W but this time using push buttons via the board's GPIO pins. 

The design is pretty much the same. GPIO interrupts are enabled so that a handler function is triggered every time the button is pressed. The handler function sends a notification to a Task that handles the button presses.

For the sake of simplicity, I'll only put in 3 buttons.

![[Pasted image 20251001121934.png]]

# Clarifying How GPIO Push Buttons Work
The principle behind push buttons and GPIO input is simple, but I thought it was good to clarify it first before I got down to programming and wiring the breadboard.

The push button is connected on one end to the GPIO pin, while the other end is connected to a power source. It functions like a switch in a circuit. If it isn't pushed, then the circuit is open and no electricity flows through (the GPIO signal is LOW). Once it is pushed, the circuit is closed and a signal will go through (the GPIO signal becomes HIGH). We can detect when the button is pushed based on when the GPIO signal is pulled from LOW to HIGH.

# GPIO Initialization
First, I defined which GPIO pins I'll be using.
```c
#define BUTTON_1 18 
#define BUTTON_2 19
#define BUTTON_3 20
```

Then a function to initialize the GPIO pins and enable interrupts.
```c
void GPIO_setup(){
    gpio_init(BUTTON_1);
    gpio_init(BUTTON_2);
    gpio_init(BUTTON_3);
    gpio_set_irq_enabled_with_callback(BUTTON_1, GPIO_IRQ_EDGE_FALL, 1, &vGPIOCallback);
    gpio_set_irq_enabled(BUTTON_2, GPIO_IRQ_EDGE_FALL, 1);
    gpio_set_irq_enabled(BUTTON_3, GPIO_IRQ_EDGE_FALL, 1);
}
```

The interrupts are triggered on the falling edge of the GPIO input (i.e. when the button is released). The function `vGPIOallback()` (to be written later) is set as the interrupt handler for GPIO interrupts. It only needs to be set once in `gpio_set_irq_enabled_with_callback()`. Subsequent interrupts enabled with `gpio_set_irq_enabled()` will use the same callback.

# GPIO Task
First, I define a global variable to save the Task Handle of the GPIO task (so the interrupt handler can refer to it when sending the notification.)
```c
TaskHandle_t buttonHandle;
```

Then the task itself:
```c
void vButtonTask(void *pvParameters){
    buttonHandle = xTaskGetCurrentTaskHandle();
    uint32_t gpio; //The GPIO number of the button pressed
    for (;;){
	    //Task is blocked until notification is received
	    //When received notification, save notification value in "gpio" variable
        xTaskNotifyWait(0, 0, &gpio, portMAX_DELAY);
        printf("Button %d pressed!\n", gpio);
    }
}
```

# GPIO Interrupt Handler (with Debouncing)
An issue I faced when implementing this program was that multiple button presses would be detected even if I only pushed the button once. I adapted a debouncing solution from [here](https://github.com/raspberrypi/pico-examples/pull/45/commits/e67ce83063b6ff718971f9d91315c652aa8fab4a) which seemed to fix the problem.

Here's the code I ended up with:
```c
//Global variables
unsigned long push_time = to_ms_since_boot(get_absolute_time());
const int delayTime = 100; 

void vGPIOCallback(uint gpio){
    //Brief delay to resolve debouncing issue
     if ((to_ms_since_boot(get_absolute_time()) - push_time)>delayTime) {
         push_time = to_ms_since_boot(get_absolute_time());
         xTaskNotifyFromISR(buttonHandle, gpio, eSetValueWithOverwrite, NULL);
    }
}
```

Every time a GPIO interrupt is triggered, it checks how much time has passed since the last valid interrupt (the timestamp of which is stored in `push_time`). If it is less than the interval defined in `delayTime`, then it disregards it. If not, then the interrupt is valid and it updates `push_time` with the current timestamp.

All that remiains to be done is to notify the GPIO task that a button has been pressed, and send the GPIO number along with the notification.

# Putting It All Together
Finally, the `main()` function:
```c
void main() {
    stdio_init_all();
	push_time = to_ms_since_boot(get_absolute_time());
    GPIO_setup();
    xTaskCreate(vButtonTask, "Button Task", 256, NULL, 1, NULL);
    vTaskStartScheduler();
}
```

And here's how I wired the push buttons to the board:

![[content/Images/20250908_122324.jpg|500]]

I connected Pin 36 (3V3 (OUT)) to the positive power rail of the breadboard (i.e. the red power rail). I then connected each of the buttons to the positive power rail.

Then I connected the remaining pin of each push button to GPIO pins 18, 19 and 20 (which I had defined in the code).

# Testing
I tried pushing the buttons in random sequences and checked the output in mincom, and it worked as expected.

![[Pasted image 20250908123309.png|300]]

# References
- [Using a Push Button with Raspberry Pi GPIO](https://raspberrypihq.com/use-a-push-button-with-raspberry-pi-gpio/) (this one uses MicroPython) 
- [Pico Debouncing Solution (GitHub)](https://github.com/raspberrypi/pico-examples/pull/45/commits/e67ce83063b6ff718971f9d91315c652aa8fab4a)