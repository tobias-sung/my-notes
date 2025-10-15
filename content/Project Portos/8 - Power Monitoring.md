*[View the full code on GitHub](https://github.com/tobias-sung/picow-battery-status)*

Another useful feature to implement would be power monitoring. That is, if the system is running off of a battery, a "battery percentage" could be printed onto the [[6 - OLED screen|OLED screen]]. 

So far in the development, the Pico W has been powered by the micro-USB connection to my laptop. But I can simulate a battery power source by using the [Power Profiler Kit 2 (PPK2)](https://docs.nordicsemi.com/bundle/ug_ppk2/page/UG/ppk/PPK_user_guide_Intro.html) and the [Power Profiler](https://docs.nordicsemi.com/bundle/nrf-connect-ppk/page/index.html) app.

![[Power Monitor 1.gif|300]]
# Using the Power Profiler Kit 2 as a Power Source
First, I connect the VOUT pin of the PPK2 to the VSYS pin on the Pico W, and the GND pin of the PPK2 pin to any GND pin on the Pico W (one of which is conveniently located next to the VSYS pin). 

![[20251014_151006.jpg|300]]

Then I connect the PPK2 to my laptop via micro-USB cable (making sure to use the micro-USB port labelled "Data/Power"). 

I open up the Power Profiler app, press "Select Device" and select my PPK2 device.

Going into the "Source meter" power supply mode, by checking "Enable power output" the PPK2 can now supply power to the Pico W. The voltage can be modified via the "Set Supply voltage to" setting, which I can use to simulate battery drain.

![[Pasted image 20251015111504.png|499]]
# Power Monitoring Program
Now it's time to write the code that will monitor the "battery" percentage.

The ["read_vsys"](https://github.com/raspberrypi/pico-examples/tree/master/adc/read_vsys) example from the "pico-examples" GitHub repo is a great starting point. It comes with a small library of power-related functions: `power_source()` for checking whether the system is plugged in or running off of a battery, and `power_voltage()` for checking the input voltage.

## Checking Power on Startup
On startup, my program will do an initial check of the power source and, if the power source is a battery, it will also check the battery percentage. It will then print out the battery percentage onto the OLED.

```c
const float min_battery_volts = 1.8f;
const float max_battery_volts = 5.0f;

bool battery_status = true; //true means battery, false means powered

adc_init();

//Check power source
if (power_source(&battery_status) == PICO_OK) {
	//If power source is battery
	if (battery_status){
		// Get voltage
		float voltage = 0;
		int voltage_return = power_voltage(&voltage);
		voltage = floorf(voltage * 100) / 100;
		
		//Calculate battery percentage
		char percent_buf[10] = {0};
		int percent_val = (int) (((voltage - min_battery_volts) / (max_battery_volts - min_battery_volts)) * 100);
		snprintf(percent_buf, sizeof(percent_buf), " (%d%%)", percent_val);
		//Print battery percentage onto OLED
		oled_print(percent_buf);
	} else { //If power source is plugged in
		oled_print("Plugged in.");
	}
}
```

## Checking Power at Regular Intervals
Now I want the program to update the information on the OLED when there is a change in power. 

Since there doesn't seem to be a built-in interrupt for changes in input voltage, I'll create a [FreeRTOS software timer](https://www.freertos.org/Documentation/02-Kernel/02-Kernel-features/05-Software-timers/01-Software-timers) to trigger a power check at regular intervals.

```c
#include "timers.h"

TimerHandle_t xTimer;

//Create a new software timer
 xTimer = xTimerCreate
     (  //Name of timer
        "Power Status Check Timer",
        //Timer period in ticks
         200,
        // Whether the timer automatically restarts after finishing
        pdTRUE,
        //The ID is used to store a count of the number of times the
        //timer has expired, which is initialised to 0.
        ( void * ) 0,
        //Callback Function, called when timer expires
        check_battery
    );

xTimerStart(xTimer, 0); //Timer will start when RTOS scheduler is started

```

Now to write the timer's callback function, `check_battery()`. Since this is a callback function, it shouldn't check the power itself but rather call another task to do the job.[^1] 

```c
TaskHandle_t powerHandle;

void check_battery(){
	xTaskNotifyFromISR(powerHandle, NULL, eNoAction, NULL);
}
```

I then wrote a task that waits for a notification before carrying out the power checking logic (which I omit here because it's more or less the same as the code used to check on startup):

```c

void vPowerTask(){
    powerHandle = xTaskGetCurrentTaskHandle();
    for (;;){
        xTaskNotifyWait(0, 0, NULL, portMAX_DELAY);
	    //Check for any changes in power and print updates onto OLED
	    ...
    }
}
```

# Result
So now I have 2 tasks running. A simple "Blink" task that blinks the LED, and a "Power Monitoring" task that waits for the timer callback `check_battery()` to wake it up. The power status is always present on the OLED screen.

On the Power Profiler App, I can drag the supply voltage slider to vary the input voltage, and as I do so the "battery" percentage on the OLED will update in real time.

![[Power Monitor 1.gif|300]]

# Notes
[^1]: Initially, I made the mistake of putting all the power checking program logic inside of `check_battery()`, forgetting that it's a bad idea to do too much inside of a callback function. As a result, my program would keep crashing because I was making calls to `cyw43_arch` API functions from inside the callback, which the Pico SDK explicitly warns not to do.
