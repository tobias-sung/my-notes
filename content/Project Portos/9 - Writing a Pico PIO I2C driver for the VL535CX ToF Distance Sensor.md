---
title: 9 - VL535CX PIO I2C Driver
draft: false
tags:
  -
---
 [GitHub code](https://github.com/tobias-sung/pico-vl53l5cx-pio/tree/main)

At this point in development, both I2C connectors on the Pico 2W had been taken up by an OLED screen and a real-time clock respectively. So when it came time to add a *third* I2C periperhal, a VL535CX distance sensor, there was no longer any room left. 

Thankfully, the Pico series is equipped with Programmable Input-Output (PIO) cores that run independently of the CPU. They allow any GPIO pin to interface with hardware peripherals through "bit-banging". That is, sending a series of HIGH and LOW signals with precise timing. 

I took this existing [Pico driver](https://github.com/akionu/pico-vl53l5cx) for the VL535CX sensor (from GitHub user [akionu](https://github.com/akionu))and modified it to use a PIO I2C interface rather than the Pico's hardware I2C connector. I copied the low-level PIO I2C functions and PIO code from this [example](https://github.com/raspberrypi/pico-examples/tree/master/pio/i2c).

The Pico driver comes bundled with 11 examples, but for my testing I just used the most basic example `ex1_ranging_basic` which captures 10 ranging frames. All examples have the same setup: detect whether a VL535CX sensor is connected, then load the firmware onto the sensor before starting the real operation.

All the platform-dependent code is segmented in a single file, "platform.c". 

At first, I just went through all the functions in "platform.c" and replaced every `i2c_write_blocking()` with `pio_i2c_write_blocking()` and every `i2c_read_blocking()` with `pio_i2c_read_blocking()`. 

But I ran into some issues.

# Reading the Wrong Data
I was having issues with reading data from the sensor via I2C. 

At first I commented out most of the code in `ex1_ranging_basic`, with the aim of simply detecting the sensor. But it wasn't being detected, even though a [PIO I2C bus scan](https://github.com/raspberrypi/pico-examples/blob/master/pio/i2c/i2c_bus_scan.c) showed that there was indeed a device detected at the correct address. 

It turns out that the program will perform 2 reads to confirm 2 values of the device: its device ID and its revision ID. The problem is that `pio_i2c_read_blocking()` was returning 2 incorrect values, which led the program to conclude that no valid sensor was connected.

Looking at the Logic Analyzer readings in PulseView, I could see that the *correct data was being sent from the sensor to the Pico* (**F0** and **02** respectively). 

![[Pasted image 20251120174914.png]]
![[Pasted image 20251120174932.png]]

But the program wasn't reading the correct values. Instead, it read **A7** and **A6**.

I found this [forum post](https://forums.raspberrypi.com/viewtopic.php?t=340111) where someone had the exact same problem as me. In the end, they fixed the issue by adding one line (`mov isr, null`) to the PIO code in "i2c.pio" as follows:

```pio {13}
bitloop:
    out pindirs, 1         [7] ; Serialise write data (all-ones if reading)
    nop             side 1 [2] ; SCL rising edge
    wait 1 pin, 1          [4] ; Allow clock to be stretched
    in pins, 1             [7] ; Sample read data in middle of SCL pulse
    jmp x-- bitloop side 0 [7] ; SCL falling edge

    ; Handle ACK pulse
    out pindirs, 1         [7] ; On reads, we provide the ACK.
    nop             side 1 [7] ; SCL rising edge
    wait 1 pin, 1          [7] ; Allow clock to be stretched
    jmp pin do_nack side 0 [2] ; Test SDA for ACK/NAK, fall through if ACK
    mov isr, null              ; Reset the input bit counter
```

I don't quite understand how, but this fixed the issue for me. Now `pio_i2c_read_blocking()` would return the correct values, and the program would recognize that a VL535CX sensor was connected. 

# Writing Multiple Bytes
I hit another roadblock with the function `WrMulti()`. As the name suggests, it writes multiple bytes of data in a single write operation, and is used for writing the sensor firmware to the device. The firmware comes in the form of a really long integer array (about 86000 bytes), and it must be sent sequentially without stopping. Without the firmware, the sensor can't do anything.

`WrMulti()` does not contain any use of `i2c_write_blocking()`. Instead, it contained modified code copied from within the `i2c_write_blocking()` function, doing all kinds of hardware-specific operations like modifying the I2C hardware registers. 

To get a better understanding of how the transfer works, I decided to run the original code (using the hardware I2C connector) and use a Logic Analyzer to observe what the SDA/SCL signals look like during normal operation. 

Here's what a writing a single byte of data via I2C looks like (diagram courtesy of [Texas Instruments](https://www.ti.com/lit/an/slva704/slva704.pdf?ts=1763596658044&ref_url=https%253A%252F%252Fwww.ti.com%252Fproduct%252FTCA6416A%253FkeyMatch%253DTCA6416A%2526tisearch%253Duniversal_search%2526usecase%253DGPN-ALT)):

![[Pasted image 20251208153258.png]]

A START signal is sent, followed by the device address, followed by the address of the register to be written to, followed by the data to be written, before a final STOP condition.

Now here's what the beginning of `WrMulti()` looks like (on PulseView):

![[Pasted image 20251121172517.png]]

First, a START signal is sent (denoted by the green circle with an S). 

Then, the device address (denoted by the light blue hexagon with "Address write: 29"). 

Then the address (0) of the register to be written to (denoted by the two purple hexagons which both contain "Data write: 00").

Finally, the data write properly beings, starting with "E0" followed by a long string of data bytes, ending with a STOP condition.

So after some trial and error, I was able to figure out what needed to be done.

Here's what the `pio_i2c_write_blocking()` function looks like:
```c
int pio_i2c_write_blocking(PIO pio, uint sm, uint8_t addr, uint8_t *txbuf, uint len) {
    int err = 0;
    //SEND START SIGNAL
    pio_i2c_start(pio, sm);
    pio_i2c_rx_enable(pio, sm, false);
    //SEND DEVICE ADDRESS
    pio_i2c_put16(pio, sm, (addr << 2) | 1u);
    //SEND DATA
    while (len && !pio_i2c_check_error(pio, sm)) {
        if (!pio_sm_is_tx_fifo_full(pio, sm)) {
            --len;
            pio_i2c_put_or_err(pio, sm, (*txbuf++ << PIO_I2C_DATA_LSB) | ((len == 0) << PIO_I2C_FINAL_LSB) | 1u);
        }
    }
    //SEND STOP SIGNAL
    pio_i2c_stop(pio, sm);
    //ERROR CHECKING
    pio_i2c_wait_idle(pio, sm);
    if (pio_i2c_check_error(pio, sm)) {
        err = -1;
        pio_i2c_resume_after_error(pio, sm);
        pio_i2c_stop(pio, sm);
    }
    return err;
}
```

It first sends a START signal, then the device address, then the data (stored in the `txbuf` parameter), before ending with a STOP signal. 

During normal single-byte writes, the program simply takes the register address and the single-byte of data and concatenates them into a 3-byte array which is passed into the function as `txbuf`. 

With the sensor firmware being more than 80000 bytes long, it would be a waste of space to use the same concatenation method.

What I did instead was creare two new write functions, `pio_i2c_write_blocking_nostop()` and `pio_i2c_write_blocking_nostart()`. 

`pio_i2c_write_blocking_nostop()` sends the device address and 2 bytes of data but does not send a STOP signal.

`pio_i2c_write_block_nostop()` does not send a START signal, nor does it send the device address, and just starts writing data.

So I could use `pio_i2c_write_blocking_nostop()` to send the device address and register address. And then `pio_i2c_write_blocking_nostart()` to send the long string of data. With no STOP and START signals in between, just like during regular operation with the hardware I2C. 

After being confused by the code in the original driver, I was able to clarify what was happening by checking the Logic Analyzer output and in the end all I had to do was copy and paste `pio_write_blocking()` with a few lines removed. With `WrMulti()` finally working, the driver finally worked with all the examples.






