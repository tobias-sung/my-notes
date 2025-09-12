---
title: Write-Up 6
draft: false
tags:
---

I decided to try hooking up an OLED screen to the Pico W so that I could read outputs from there instead of having to use minicom every time. 

The [OLED used](https://www.taiwaniot.com.tw/product/0-96%E5%90%8Boled-%E6%B6%B2%E6%99%B6%E5%B1%8F%E9%A1%AF%E7%A4%BA%E6%A8%A1%E7%B5%84-%E9%BB%91%E5%BA%95%E7%99%BD%E5%AD%97-i2c-oled%E6%A8%A1%E5%A1%8A%EF%BC%81%E5%8F%AA%E9%9C%804%E5%80%8B%E5%BC%95%E8%85%B3/?https://www.taiwaniot.com.tw/products-category/mcuboard/=) was a 0.96 inch display running an [SSD1315](https://cursedhardware.github.io/epd-driver-ic/SSD1315.pdf) driver with an I2C interface.

# OLED Setup
I used this [Pico driver](https://github.com/daschr/pico-ssd1306) meant for use with SSD1306 displays, but it worked well enough with my SSD1315 display.

I copied the files "ssd1306.c", "ssd1306.h" and "font.h". I then had to make the following changes to "CMakeLists.txt" to ensure the proper dependencies were ready.

```TXT
#Add ssd1306.c to add_executable() 
add_executable(blink 
	main.c
	ssd1306.c 
)
...
#Add hardware_i2c to target_link_libraries()
target_link_libraries(blink 
	pico_stdlib
	pico_cyw43_arch_lwip_threadsafe_background
	FreeRTOS-Kernel 
	FreeRTOS-Kernel-Heap4
	hardware_i2c
)  
```

Then add the following macros at the start of the code:

```
#include "hardware/i2c.h"
//Assuming you copied "ssd1306.h" to the same directory as "main.c"
#include "ssd1306.h"
```

I wired the OLED as follows:

![[content/Images/20250908_131308.jpg|400]]

The SDA and SCL pins were connected to GPIO pins 14 and 15 respectively (which are connected to I2C1 of the Pico W). GND pin was connected to the GND pin right next to the GPIO pin 14. As with the [[Write-Up 3 - GPIO Button Input|button]] example, pin 36 (3V3(OUT)) was connected to the positive power rail of the breadboard, and the VCC pin of the OLED was also connected to the same power rail to get power.

And then a setup function:

```C
#define OLED_SCL 15
#define OLED_SDA 14

ssd1306_t disp; //Global variable for referring to the OLED hardware

void setup_oled(void) {
    i2c_init(i2c1, 400000);
    gpio_set_function(OLED_SDA, GPIO_FUNC_I2C);
    gpio_set_function(OLED_SCL, GPIO_FUNC_I2C);
    gpio_pull_up(OLED_SDA);
    gpio_pull_up(OLED_SCL);

    disp.external_vcc=false;
    //The display is initialized to be 128 by 64 pixels large
    ssd1306_init(&disp, 128, 64, 0x3C, i2c1);
    ssd1306_clear(&disp);
}
```

# Printing a string onto the OLED
Printing a string onto the screen is fairly straightforward:

```C
void print_oled(char* word){
    ssd1306_clear(&disp);
    //Draw the string at position x:8, y:24 with scale 1
    ssd1306_draw_string(&disp, 8, 24, 1, word);
    ssd1306_show(&disp);
}
```

# Putting It All Together
Since most of the code is squared away in the functions, the `main()` functions ends up looking fairly simple.
```C
void main() {
    int test = 7134;
    char message[50];
    sprintf(message, "Value of test: %d", test);
    
    stdio_init_all();
    oled_setup();
    oled_print(message);
}
```

I tried printing text with a variable, since that's what the display would primarily be used for (`sprintf()` requires `#include "stdio.h`). And the result:

![[content/Images/20250908_132656.jpg|300]]

# Bonus: Scrolling Text
Through some trial and error, I found that the maximum number of characters the can be printed on the screen (in a single line) is 20 characters. I tried implementing scrolling text for strings longer than 20 characters. It's not a really practical solution and I didn't use it in the final project, but I'll still save it here in case it's somehow useful. 

Scrolling simply involves re-drawing the string multiple times, decreasing the x-position every iteration to give the illusion of movement.

The question was: how many iterations would be needed (i.e. how many times do we shift the string to the left by 1 pixel) to show the entire string?

The screen can fit 20 characters. The width of the screen is 128 pixels. Dividing 128 pixels by 20, that means each character is about 6.4 pixels wide. Therefore, we need to shift the string to the left by "number of extra characters multipled by 6.4" pixels.  

The number of extra characters in the word would be `strlen(word) - 20`. Rounding up 6.4 to 7 (to leave more room at the end of the string), I wrote the following:

```C
for (int i = 0; i < (strlen(word) - 20) * 7; i++){
        ssd1306_clear(&disp);
        //8 is the initial x-position
        ssd1306_draw_string(&disp, 8 - i, 24, 1, word);
        ssd1306_show(&disp);
        ssd1306_clear(&disp);
}
```
(`strlen()` requires `#define "string.h"`)

Here's the result:

![[WhatsApp Video 2025-09-08 at 13.43.13.gif]]

# References
- [Driver for using SSD1306 Display with Pico (GitHub)](https://github.com/daschr/pico-ssd1306)
- ["pico-ssd1306" Library Documentation](https://daschr.github.io/pico-ssd1306/ssd1306_8h.html#a4fa45ef8fd75cb3ff1b1c2378d064266)
- [How to use an OLED Display with Raspberry Pi Pico](https://www.instructables.com/How-to-Use-an-OLED-Display-With-Raspberry-Pi-Pico/) (It uses MicroPython but useful for verifying the wiring)
- [Specs of the OLED I used](https://www.taiwaniot.com.tw/product/0-96%E5%90%8Boled-%E6%B6%B2%E6%99%B6%E5%B1%8F%E9%A1%AF%E7%A4%BA%E6%A8%A1%E7%B5%84-%E9%BB%91%E5%BA%95%E7%99%BD%E5%AD%97-i2c-oled%E6%A8%A1%E5%A1%8A%EF%BC%81%E5%8F%AA%E9%9C%804%E5%80%8B%E5%BC%95%E8%85%B3/?https://www.taiwaniot.com.tw/products-category/mcuboard/=)
