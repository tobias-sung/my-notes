---
title: Write-Up Appendix 3 - UART Debug Output
draft: false
tags:
  -
---
During development, I used a lot of `printf()` statements for debugging purposes (e.g. making sure variables had the right values, checking whether certain functions were passing etc). These messages are outputted via the Pico W's UART interface, allowing me to read them in `minicom`. However, it wouldn't be ideal to have all these messages clogging up the UART interface when the program is actually in use.

The Pico W comes with 2 UART interfaces (uart0 and uart1). Therefore, I set about changing all the `printf()` statements to output to uart1 instead, allowing uart0 to focus solely on receiving external inputs.

# Initializing uart1
I first modified my [[Write-Up 2 - UART Communication#UART Initialization| UART setup function]] to set up the uart1 interface:
```c
void UART_setup(){
    uart_init(uart0, 115200);
    
    uart_init(uart1, 115200);
    gpio_set_function(4, GPIO_FUNC_UART);
    gpio_set_function(5, GPIO_FUNC_UART);
    uart_set_translate_crlf(uart1, true); 

    irq_set_exclusive_handler(UART0_IRQ, vUARTCallback);
    irq_set_enabled(UART0_IRQ, true);
    uart_set_irqs_enabled(uart0, 1, 0); 
}
```

uart1 won't work unless the associated GPIO pins are initialized as well, whereas uart0 works regardless. I'm assuming this is because uart0 is the default interface. 

I also called `uart_set_translate_crlf()` which formats the UART output by converting every line-feed (`\n`) into a carriage return (`\r`). Without doing so, every new line in my uart1 output would shift to the right and create this weird "staircase" output:
![[Pasted image 20250919112245.png]]

# Custom "print" function
Although I wanted to try putting everything in a macro (so that I could just define all the code in my global header file without having to create another ".c" file), I ended up just writing a function `debug_print()` which uses the function `uart_puts()` to send output to the uart1 interface. 

Initially, it was really simple and could only print out non-formatted strings:
```c
int debug_print(const char* msg){
	uart_puts(uart1, msg);
}
```

Of course, this isn't very useful since the whole point of debug messages is that we want to verify the values of certain variables. But I didn't know how to write a function that accepts an unknown number of parameters.

Through researching how to write custom `printf()` functions, I learned about the ellipsis `...` operator which can be used to accept a variable number of arguments in a function. A variable argument list `va_list` can store all the arguments and then pass them to the function `vsprintf()`, which packages the formatted output into a string. I could then pass this string to `uart_puts()` for the final output.

```c
int debug_print(const char* msg, ...){
    char buffer[512];
    memset(buffer, 0, sizeof(buffer));
	
    va_list list;
    //Initialize the variable argument list
    va_start(list, msg); //msg refers to the last known argument (right before the ellipsis ...), with the arguments afterwards being unknown 

    vsprintf(buffer, msg, list);
    
    va_end(list);
    
    uart_puts(uart1, buffer);


}
```

I initially set the size of `buffer` to be smaller, but then I remembered that at one point my program will print out the HTTPS response from the server, which can be as large as 700 bytes. I enlarged the buffer and rewrote the callback function that prints out the HTTPS response so that it would use a for-loop to print the response in smaller chunks rather than all at once.

I then used "Search and Replace" to replace all uses of `printf()` in the programm with my `debug_print()` function. 

In order to allow the function to be used across all the source files, I defined the function in "globals.c", declared it in a header file "globals.h", and then included "globals.h" in every source file that needed to print out debug messages. 
# Result
I now use 2 USB-to-TTL converters, one connected to GPIO pins 1 and 2 (uart0) and the other connected to GPIO pins 4 and 5 (uart1). 

![[20250919_114444.jpg|300]]

I can communicate with uart0 with `minicom -D /dev/ttyUSB0` and uart1 with `minicom -D /dev/ttyUSB1`, which I open side-by-side in the terminal. 

![[Pasted image 20250919115249.png]]

On the left is uart0, which I use for inputting commands. On the right is uart1, which outputs debug messages in response to my inputs in uart0. 

I'm actually still using `printf()` to print out the typed characters on uart0, but this can be skipped by using CTRL+A+E to activate echo mode in minicom, which echoes the inputted characters onto the screen.
# Resources
- [vsprintf() - TutorialsPoint](https://www.tutorialspoint.com/c_standard_library/c_function_vsprintf.htm)
