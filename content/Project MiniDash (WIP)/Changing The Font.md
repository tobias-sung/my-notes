By default, the font for drawing strings on the display is Courier New which is nice and all, but it'd be nice to have my own custom fonts.

In the demo project, all the font styles are saved as C files in the folder "lib/fonts". All the font files are named with the same convention. For example, a Courier New font style with a size of 12 pixels is saved as "font12.c".

Each font file contains a "font table", which is a long array of integers storing a bitmap for each character. For example, the bitmap of the character "A" with a height of 20 px and a width of 18 px would look like:

```c
    // @1980 'A' (18 pixels wide)
    0x00, 0x00, 0x00, /* |                  | */
    0x00, 0x00, 0x00, /* |                  | */
    0x00, 0x00, 0x00, /* |                  | */
    0x00, 0x00, 0x00, /* |                  | */
    0x01, 0xC0, 0x00, /* |       ###        | */
    0x01, 0xC0, 0x00, /* |       ###        | */
    0x01, 0xC0, 0x00, /* |       ###        | */
    0x03, 0x60, 0x00, /* |      ## ##       | */
    0x03, 0x60, 0x00, /* |      ## ##       | */
    0x02, 0x60, 0x00, /* |      #  ##       | */
    0x06, 0x30, 0x00, /* |     ##   ##      | */
    0x06, 0x30, 0x00, /* |     ##   ##      | */
    0x0C, 0x38, 0x00, /* |    ##    ###     | */
    0x0F, 0xF8, 0x00, /* |    #########     | */
    0x0F, 0xF8, 0x00, /* |    #########     | */
    0x18, 0x0C, 0x00, /* |   ##       ##    | */
    0x18, 0x0C, 0x00, /* |   ##       ##    | */
    0x18, 0x0C, 0x00, /* |   ##       ##    | */
    0x00, 0x00, 0x00, /* |                  | */
    0x00, 0x00, 0x00, /* |                  | */
```

There are 20 rows, corresponding to the height of 20 px. Each row contains 18 bits of data (spread across 3 bytes, which is 24 bits), corresponding to the width of 18 px. The code helpfully includes a visual representation of the character that corresponds with the bitmap.

# Generating a Font Table from .TTF file
I used this [font generator Python script](https://github.com/zst-embedded/STM32-LCD_Font_Generator/tree/master) from user "zst-embedded" on GitHub, who created the script to generate fonts for the STM32 LCD driver. 

Generating the C file is a simple as running:
```shell
python3 ./gen_font.py --font myFont.ttf --size 20
```

The only modifications I made was to change the name of the script to something simpler and having it generate C files instead of C header files (to fit with the demo project's file structure).

At the end of the generated file, there will be a variable declaration:
```c
sFONT myFont20 = {
    myFont20_Table,
    18, /* Width */
    20, /* Height */
};
```

This variable is how we'll access our font from the code. I declare the new font in "lib/Fonts/fonts.h" as follows:

```c
extern sFONT myFont20;
```

And now I can use it in the code!

```c
//Draw string "Hello world" at position (x=20,y=50) with myFont20, 
//with white foreground and black background
Paint_DrawString_EN(20, 50, "Hello world!", &myFont20, WHITE, BLACK);
```

# Declaring Standard Font (and learning about initializing with constants)
To declare a standard font across all the text, at first I thought I could just declare a global varaible:
```c
const sFont font = myFont20;
```

But the C compiler gave me the following error: `Error "initializer element is not constant"`.

I found this [post](https://stackoverflow.com/questions/3025050/error-initializer-element-is-not-constant-when-trying-to-initialize-variable-w) on Stack Overflow explaining the issue. You see, a global variable has what is called "static storage duration". This means that it is allocated memory when the program starts, and doesn't get destroyed until the progra terminates (i.e. it lives as long as the program does). In C, the rule is that such variables can only be initialized with **constant expressions**, or **literal constants**. A literal constant is a fixed-value with no identifier or address. For example, `3.14`, `'A'`, `9000` are examples of literal constants. These can be used to initialize variables with static storage duration.

My problem is that I'm trying to assign a global variable with an expression that is NOT a literal constant, since `myFont20` is a **variable identifier**.

Therefore, I should have used the `#define` macro to declare the font type:

```c
#define font myFont20
```

