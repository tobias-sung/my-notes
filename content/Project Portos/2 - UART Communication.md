---
title: 2 - UART Communication
draft: false
tags:
---
[GitHub code](https://github.com/tobias-sung/uart_console)

My first task was to setup basic UART communication, which would allow me to send text messages serially to the Pico W through a serial communication program like "minicom". 

![[Pasted image 20251001121636.png]]

My plan is to create a Task for processing UART input. This Task is usually in a blocked state, and only unblocks if UART input is detected. 

In order to detect UART input, I'll use the Pico's built-in UART interrupts. When the interrupt is triggered, the interrupt handler will send a [direct-to-task notification](https://www.freertos.org/Documentation/02-Kernel/02-Kernel-features/03-Direct-to-task-notifications/01-Task-notifications) to the UART task and unblock so it can handle the incoming UART data.

![[Pasted image 20251001121737.png]]
# UART Initialization 
I wrote a short function to take care of all the UART initialization. 

```c
void UART_setup(){
    uart_init(uart0, 115200);
    irq_set_exclusive_handler(UART0_IRQ, vUARTCallback);
    irq_set_enabled(UART0_IRQ, true);
    uart_set_irqs_enabled(uart0, 1, 0);
}
```

I'm using UART0 with a baud rate of 115200. I set the handler of the UART interrupts to be a function called `vUARTCallback()` (to be written later). Finally, I enabled the UART IRQ and set it so that it triggers an interrupt when the UART RX buffer contains data (the second and third parameters of `uart_set_irqs_enabled()` are used to determine whether the RX buffer and the TX buffer trigger interrupts respectively).  
# UART Task
First, I set a global variable for storing the task handle of the UART task. I made it global so that the UART interrupt handler can refer to it because it has to send a notification to the UART task when the interrupt is triggered.
```c
TaskHandle_t uartHandle;
```

Some basic set-up first:
```c
void vUARTTask(void *pvParameters) {
    uartHandle = xTaskGetCurrentTaskHandle(); //Get the task handle
    uint32_t output_char; //Variable for storing the UART character inputted at interrupt
    int i = 0; //Counter for filling the buffer
    char buffer[512]; //Buffer for storing the UART input
    
    memset(buffer, 0, sizeof(buffer)); //Clear the buffer of any garbage values
```

Now for the loop:
```c 
    for (;;){
	    //Task is blocked until notification is received
	    //Stores notification data in variable "output_char"
        xTaskNotifyWait(0, 0, &output_char, portMAX_DELAY);
        //Check if ENTER was pressed
        if (output_char != '\r'){
            printf("%c", output_char); //Print out the inputted character
            buffer[i] = output_char; //Append character to buffer
            i++; //Increment counter
        } else {
            printf("\n");
            //Parse inputted message
            if(!strcmp(buffer, "reset")){
                printf("Resetting system...\n");
            }
            if (!strcmp(buffer, "query")){
                printf("Querying...\n");
            }
            i = 0; //Reset buffer counter
            memset(buffer, 0, sizeof(buffer)); //Clear buffer
        } 
    }
}
```

I added in some dummy responses to certain messages (like "reset" and "query") just to make sure the messages could be read correctly by the Pico.

# UART Interrupt Handler
Finally, the interrupt handler that fires whenever UART input is detected.
```c
void vUARTCallback(){
	//Read character that was inputted and store in variable "input"
    uint32_t input = getchar();
    //Send notification, and include inputted character in the notification
    xTaskNotifyFromISR(uartHandle, input, eSetValueWithOverwrite, NULL);
}
```
Using the global variable `uartHandle`, the handler can know which task to notify.

Direct-to-task notifications can store a 32-bit value, and this value can be updated every time the notification is sent. The third parameter of `xTaskNotify()` (here I used `xTaskNotifyFromISR()` since, well, we're sending it from inside an interrupt handler) decides how the value is to be updated. I set it to `eSetValueWithOverwrite`, since I'm transmitting a new UART input character every interrupt.

# Putting It All Together
Finally, it can all be put together in the `main()` function:
```c
void main() {
    stdio_init_all();
    UART_setup();

    xTaskCreate(vUARTTask, "UART Task", 256,  NULL, 1, NULL);
    vTaskStartScheduler();
}
```

# Testing

I used a USB-to-TTL converter to communicate with the Pico's UART over a USB connection to my laptop. I connected the RXD pin of the converter to the GP0 of the Pico W (UART0 TX) and the TXD pin to GP1 (UART0 RX).

![[content/Images/20250908_112119.jpg|250]]

I then used minicom (which I ran in the terminal using `sudo minicom -D /dev/ttyUSB0`) to send messages to the UART and it appears to be working.

![[Pasted image 20250908114036.png]]


# References
**Documentation**
- [FreeRTOS Task Notification API Documentation](https://freertos.org/Documentation/02-Kernel/04-API-references/05-Direct-to-task-notifications/00-RTOS-task-notifications)
- [Pico W Pinout Diagram](https://datasheets.raspberrypi.com/picow/PicoW-A4-Pinout.pdf)
**Concepts**
- [FreeRTOS Direct-to-Task Notifications (Blog Post)](https://www.freertos.org/Documentation/02-Kernel/02-Kernel-features/03-Direct-to-task-notifications/01-Task-notifications)
-  [(Video) Communicate with your Pico serially](https://www.youtube.com/watch?v=pbWhoJdYA1s&t=34s)



