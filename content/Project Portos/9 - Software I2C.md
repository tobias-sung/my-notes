During development, in addition to the OLED screen a real-time clock was connected to the Pico for keeping the time. This meant that both the I2C controllers were occupied, so when it came time to add a *third* I2C periperhal, a VL535CX time-of-flight sensor, there was no longer any room left. 

Thankfully, the Pico series of boards are equipped with Programmable Input-Output (PIO) cores. Essentially, these cores allow any GPIO pin to interface with hardware peripherals through "bit-banging". That is, sending a series of HIGH and LOW signals with precise timing. Having a separate "mini-processor" take care of this resource-intensive process (I'd imagine bit-banging to require as much concentration as playing a complex piano piece!) frees the CPU up to do other things.

# Porting the ToF Sensor Driver to Pico
I didn't need to port the driver myself because there already was this [GitHub project](https://github.com/akionu/pico-vl53l5cx) that did just that. However, this project uses an I2C controller so my job was to modify all the I2C read/writes to use PIO instead.

# Modifying Pico Driver to use PIO
The ToF sensor driver code was very well organized, such that all the platform-dependent code is segmented in a single file, "platform.c" (with a header file "platform.h").



