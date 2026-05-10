I wanted to draw an icon on the screen to represent the current weather conditions. Like this photo:

![[E-Ink Weather Icon Prototype.png]]

But when I checked the [documentation](https://www.waveshare.com/wiki/Pico-CapTouch-ePaper-2.9#Application_Programming_Interface) of the CapTouch display, I could only find functions for drawing squares, lines and circles. Nothing about bitmaps.

Thankfully, I found the following functions tucked away in the "GUI_Paint.c" file of the CapTouch's C library files:
```C
/******************************************************************************
function:	Display monochrome bitmap
parameter:
    image_buffer ：A picture data converted to a bitmap
info:
    Use a computer to convert the image into a corresponding array,
    and then embed the array directly into Imagedata.cpp as a .c file.
******************************************************************************/
void Paint_DrawBitMap(const unsigned char* image_buffer)
{
    UWORD x, y;
    UDOUBLE Addr = 0;
	//Paint.HeightByte is equal to 128, the height of the screen
	//Paint.WidthByte is equal to 296/8 = 37, the width of the screen in bytes
    for (y = 0; y < Paint.HeightByte; y++) {
        for (x = 0; x < Paint.WidthByte; x++) {//8 pixel =  1 byte
            Addr = x + y * Paint.WidthByte;
            Paint.Image[Addr] = (unsigned char)image_buffer[Addr];
        }
    }
}
```

It takes in a character array which defines what color each pixel should be (1 for black, 0 for white). It's a bit annoying because you need to give it an image that is the same size as the entire screen (there are no input parameters for starting x-y position), but as long as you draw it first you can then draw other elements on top of it.

Each character is 8 bits, and each bit represents a pixel. So if the first character in my array is 0xFF (1111 1111 in binary), that means the first 8 pixels (at x-y coordinates (0,0), (1,0), (2,0), (3,0), (4,0), (5,0), (7,0), where (0,0) is the pixel at the upper left corner) on the screen will be set to black. 

Looking at the for-loop, it's pretty straightforward. The screen is 296 pixels wide, and 128 pixels tall. Since 1 byte represents 8 pixels, each of the 128 "rows" of the screen is represented by 296 / 8 = 37 bytes. We iterate through the character array in groups of 37 bytes, filling in each row one by one.

Or at least that's what I thought.

I asked Claude to generate a Python script that would convert a PNG image into a C character array:

```python
from PIL import Image

def png_to_epd_array(input_path, output_path, width=296, height=128):
    img = Image.open(input_path)
    
    # Resize if needed
    img = img.resize((width, height))
    
    # Convert to pure 1-bit black/white
    # "1" mode: 0 = black, 255 = white
    img = img.convert("1")
    
    pixels = list(img.getdata())
    
    # Pack 8 pixels per byte, MSB first
    # EPD convention: 1 = white, 0 = black
    byte_array = []
    for i in range(0, len(pixels), 8):
        byte = 0
        for bit in range(8):
            if i + bit < len(pixels):
                # White pixel (255 in "1" mode) -> bit = 1
                if pixels[i + bit] != 0:
                    byte |= (0x80 >> bit)
        byte_array.append(byte)
    
    # Write as C header file
    with open(output_path, "w") as f:
        f.write("#ifndef IMAGE_DATA_H\n")
        f.write("#define IMAGE_DATA_H\n\n")
        f.write("#include <stdint.h>\n\n")
        f.write(f"// {width}x{height} monochrome bitmap, 1=white 0=black\n")
        f.write(f"const unsigned char IMAGE_DATA[] = {{\n    ")
        
        for i, b in enumerate(byte_array):
            f.write(f"0x{b:02X}")
            if i < len(byte_array) - 1:
                f.write(", ")
            if (i + 1) % 16 == 0:
                f.write("\n    ")
        
        f.write("\n};\n\n")
        f.write("#endif // IMAGE_DATA_H\n")
    
    print(f"Done. {len(byte_array)} bytes written to {output_path}")

png_to_epd_array("my_icon.png", "image_data.h")
```

I then copied the resulting array into my C code, and then used the array as the input parameter of the `Paint_DrawBitMap()` function. But the result was...well:

![[E-Ink Screen Icon Fail.png]]

A bunch of vertical lines. But the fact that they were vertical hinted at the underlying issue: the `Paint_DrawBitMap()` function was painting the screen **column by column** and not **row by row**.

To test this, I tried setting all but the first row of pixels to be black (that is, pixels (0,0), (1,0), ... , (296,0)). But instead of the top row of the screen being white, this happened:

![[E-Ink Screen Icon Fail 2.png]]

The first two COLUMNS (and some of the third column) became white. So despite the fact that the for-loop in `Paint_DrawBitMap()` appears to be drawing the screen row by row, it is in fact drawing it column by column. 

So the first bit in the character array is applied to the pixel at the lower right corner, then the second bit is applied to the pixel above, then the third bit applied to the pixel above and so on. Once we reach the top of the screen, it then goes to the lowest pixel of the second column, and repeats.

Apparently this is what's known as an "upward vertical byte" layout (even though the `Paint_DrawBitMap()` logic appears to be using a "left-to-right horizontal byte" layout).

So Claude generated another function that converts my PNG to work on this layout, where each byte in the array represents 8 pixels going downward:
```python
def png_to_epd_array_vertical_up(input_path, output_path, width=296, height=128):
    img = Image.open(input_path)
    img = img.resize((width, height))
    img = img.convert("1")
    
    pixels = list(img.getdata())
    
    def get_pixel(x, y):
        if x < width and y < height:
            return pixels[y * width + x]
        return 255  # white/empty for out-of-bounds
    
    height_bytes = (height + 7) // 8  # ceil(height / 8)
    byte_array = []
    
    # Iterate column by column
    for x in range(width):
        # Iterate through vertical byte groups from BOTTOM to TOP
        for byte_row in range(height_bytes - 1, -1, -1):
            byte = 0
            for bit in range(8):
                # Within each byte, bit 0 (MSB) is the LOWEST pixel in the group
                y = byte_row * 8 + (7 - bit)
                pixel = get_pixel(x, y)
                if pixel != 0:  # white
                    byte |= (0x80 >> bit)
            byte_array.append(byte)
    
    with open(output_path, "w") as f:
        f.write("#ifndef IMAGE_DATA_H\n")
        f.write("#define IMAGE_DATA_H\n\n")
        f.write("#include <stdint.h>\n\n")
        f.write(f"// {width}x{height} vertical-byte monochrome bitmap, upward encoding\n")
        f.write(f"const unsigned char IMAGE_DATA[] = {{\n    ")
        
        for i, b in enumerate(byte_array):
            f.write(f"0x{b:02X}")
            if i < len(byte_array) - 1:
                f.write(", ")
            if (i + 1) % 16 == 0:
                f.write("\n    ")
        
        f.write("\n};\n\n")
        f.write("#endif // IMAGE_DATA_H\n")
    
    print(f"Done. {len(byte_array)} bytes written to {output_path}")
```

And voila, it worked!

![[E-Ink Weather Icon Prototype.png]]

I won't go into too much detail about the code yet, but by drawing the bitmap first I could then add other elements on top.

```c
//Paint the bitmap icon
Paint_DrawBitMap(IMAGE_DATA);
//Paint the date
Paint_DrawString_EN(10, 50, datetime_buf, &font, WHITE, BLACK);
//Paint the day of the week
Paint_DrawString_EN(30, 80, days[t.dotw], &FontSolway12, WHITE, BLACK);
//Paint placeholder temperature text
Paint_DrawString_EN(220, 100, "24C", &FontSolway12, WHITE, BLACK);
```

Next step is to get this thing connected to a proper weather API so I can actually get the display to show real data.
