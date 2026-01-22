---
title: 7 - Modifying System Variables via Configuration File
draft: false
tags:
  -
---
*[View the full code on GitHub](https://github.com/tobias-sung/pico-msc-config-freertos)*

So far, I've been defining a lot of configuration variables (such as the Wi-Fi SSID/password and server address) as `#define` macros in the code. While this was convenient for initial development, having to modify the code and rebuild the program every time we wanted to make a simple change to the configuration would get very tedious. 

Therefore, it was proposed to find a way to get the Pico W to read the information from a text file stored in its flash storage. Then, every time we want to adjust the configuration, we would simply have to plug the Pico W into a computer, open the text file and make the changes, before rebooting the Pico W.

Initially, I tried directly loading a binary file onto the internal flash using OpenOCD/pyOCD, but this proved to not be very user-friendly (I go into more detail in [[Appendix 4 - Reading from Flash|Appendix 4]]).

I looked up if other Pico developers had tried implementing similar solutions, and was fortunate enough to find this [project](https://github.com/oyama/pico-msc-wifi-setting) (which makes use of the TinyUSB library) that exactly suited my needs. It hooks up the Pico W as a FAT12 storage device with a text file (**"WIFI.TXT"**) that can be edited during runtime. Every time the text file is modified, the Pico will re-connect to the Wi-Fi using the new SSID/password that was saved to the file.

![[Pasted image 20251001122904.png|400]]

All I needed to do was adapt the original project (which was a bare-metal program utilizing a forever loop) to work under FreeRTOS.
# Copying Over The Code
I copied the following files over:
- msc_disk.c
- tusb_config.h
- usb_descriptors.c
- wifi_settings.h
- wifi_settings.c

In "tusb_config.h", I changed the following setting since this is a FreeRTOS project:
```c
#define CFG_TUSB_OS OPT_OS_FREERTOS
```

Then, in my "main.c", I wrote the following FreeRTOS task by adapting code from the ["cdc_msc_freertos"](https://github.com/hathach/tinyusb/blob/master/examples/device/cdc_msc_freertos/src/main.c) example from the TinyUSB GitHub repo:

```c
TaskHandle_t usbHandle;

static void vUSBTask() {

    usbHandle = xTaskGetCurrentTaskHandle();

    tusb_rhport_init_t dev_init = {
        .role = TUSB_ROLE_DEVICE,
        .speed = TUSB_SPEED_AUTO
    };
    tusb_init(BOARD_TUD_RHPORT, &dev_init);

    // RTOS forever loop
    while (1) {
        // put this thread to waiting state until there is new events
        tud_task();
        // following code only run if tud_task() process at least 1 event
        tud_cdc_write_flush();
    }
}
```

This task waits for USB events to occur and processes them when they happen.

I then adapted the code from the project for reading the config info and connecting to Wi-Fi:

```c
wifi_setting_t wifi_setting;
//Attempt to read Wi-Fi settings from text file
if (!wifisetting_read(&wifi_setting)) {
    // Initialize text file if it's empty
    strncpy(wifi_setting.ssid, "SET_SSID", sizeof(wifi_setting.ssid));
    strncpy(wifi_setting.password, "SET_PASSWORD", sizeof(wifi_setting.password));
    wifisetting_write(&wifi_setting);
} else {
    int attempts = 0;
    //Connect to WiFi. Stops trying to reconnect after 5 failed attempts
    while (cyw43_arch_wifi_connect_timeout_ms(wifi_setting.ssid, wifi_setting.password, CYW43_AUTH_WPA2_AES_PSK, 10000) && attempts < 5) 
    {
        printf("Failed to connect to Wi-Fi. Retrying...\n");
        attempts++;
    } 
}
```

After adding `vUSBTask()` to the scheduler , whenever I plug in the Pico W a storage device "PICO CONFIG" would appear in my file browser containing "WIFI.TXT" with the following simple format:

```
ssid=SET_SSID
password=SET_PASSWORD
```

# Making It Thread-Safe
Although it was working fine with just one task running in the scheduler, things started to go wrong when I tried integrating it with all the other features. When saving changes to the text file, the program would crash and the changes would not be saved. 

The process of writing to flash was being interrupted, likely due to the Pico W using the "eXecute In Place" (XIP) technique of running code directly from flash. During the writing process, the Pico W was probably executing code from elsewhere on the flash and causing a conflict.

In order to get it to work properly, I made 3 changes.

## 1 - Reduce to Single-Core
First, I configured FreeRTOS to use only one core by changing the following in "FreeRTOSConfig.h":
```
#define configNUM_CORES 1
```
## 2 - Use `flash_safe_execute()`
Secondly, when calling the flash API functions for erasing and writing to flash, I would use the `flash_safe_execute()` function, which disables all IRQs and prevents the other core from executing/reading from flash while the flash operations are in progress. 

One issue is that `flash_safe_execute()` only executes functions that have a single input parameter. So I need to define functions that take in a single array of parameters, parse the array and then call the flash API functions:

```c
//Erase flash
static void call_flash_range_erase(void *param) {
    uint32_t offset = (uint32_t)param;
    flash_range_erase(offset, FLASH_SECTOR_SIZE);
}

//Load to flash
void call_flash_range_program(void *param) {
    uint32_t offset = ((uintptr_t*)param)[0];
    const uint8_t *data = (const uint8_t *)((uintptr_t*)param)[1];
    flash_range_program(offset, data, FLASH_PAGE_SIZE);
}
```

Then, I can modify the function that writes to flash:
```c
void wifisetting_write(wifi_setting_t *setting) {
    uint8_t buffer[FLASH_PAGE_SIZE];
    
    memcpy(setting->magic, WIFI_SETTING_MAGIC, sizeof(setting->magic));
    memcpy(buffer, setting, sizeof(wifi_setting_t));

    flash_safe_execute(call_flash_range_erase, (void*)FLASH_TARGET_OFFSET, UINT32_MAX));
    
    uintptr_t params[] = { FLASH_TARGET_OFFSET, (uintptr_t)buffer};
    flash_safe_execute(call_flash_range_program, params, UINT32_MAX));

}
```

Even though I've already configured the system to use only one core, `flash_safe_execute()` doesn't know that and still assumes that the other core is active. Therefore, it will not execute the flash operations unless I add the following to "CMakeLists.txt":
```
target_compile_definitions(blink PRIVATE
  PICO_FLASH_ASSUME_CORE1_SAFE=1
)
```

Now this should ensure that no other flash operations will occur during erases and writes to flash.
## 3 - Dedicated Task for Writing
Finally, I created a new Task with the sole purpose of writing to flash. 

Originally, the function `wifisetting_write()` was being called from inside the callback function `tud_msc_write10_cb()` (located in "msc_disk.c, and invoked whenever the changes to the text file are saved). `wifisetting_write()` contains the critical flash operations that can't be interrupted, so it didn't seem like a good idea to call it from a callback function.  

So I created a new Task called "vWriteTask" that would wait for a notification before calling `wifisetting_write()` to save the changes to the text file. I gave it a stack depth of 256 (any lower would cause the program to crash).
```c
void vWriteTask(){
	uint32_t output;
	writeHandle = xTaskGetCurrentTaskHandle();
	for (;;){
		xTaskNotifyWait(0, 0, &output, portMAX_DELAY);
		
		taskENTER_CRITICAL();
		wifisetting_write(&global_wifi);
		taskEXIT_CRITICAL();
	}
}
```

I then modified the callback function `tud_msc_write10_cb()` so that it would simply send a notification to `vWriteTask()` rather than carry out the lengthy flash operation.

Originally, I had intended to send the updated configuration settings from `tud_msc_write10_cb()` to `vWriteTask()` via the notification's value. But (for reasons I have yet to figure out) the value always came out incomplete, so I resorted to creating a global variable `global_wifi` instead that would be directly updated by `tud_msc_write10_cb()` and accessed by `vWriteTask()` after receiving the notification.
# Adding additional settings
Adding additional configuration settings was very simple thanks to the way the original project was designed. 

I tried adding an extra option for configuring the domain name of the HTTPS server (titled `http_server`), and I just had to make the following changes:
**"wifi_setting.h"**
```c
typedef struct {
    uint8_t magic[4];
    uint8_t ssid[33];
    uint8_t password[64];
    uint8_t http_server[64];
} wifi_setting_t;
```
**"wifi_setting.c"**
```c
bool wifisetting_parse(wifi_setting_t *setting, const uint8_t *buffer, size_t buffer_len) {
    int n = sscanf(
		    buffer,
		    "ssid=%32[^\n]\npassword=%63[^\n]\nhttp_server=%63[^\n]\n",
            setting->ssid,
            setting->password,
            setting->http_server);
    return n == 2;
}

void wifisetting_encode(uint8_t *buffer, wifi_setting_t *setting) {
    sprintf(buffer,
            "ssid=%s\npassword=%s\nhttp_server=%s\n",
            setting->ssid,
            setting->password,
            setting->http_server);
}
```
**"msc_disk.c"**
```c
#define DEFAULT_SETTING "ssid=SET_SSID\npassword=SET_PASSWORD\nhttp_server=SET_HTTP_SERVER\n"
```

Afterwards, I could refer to the `http_server` value from the `wifi_setting_t`-type structure the same way I referred to the `ssid` and `password` values.

![[Pasted image 20250915140235.png]]

## Automating the process
In the previous section I outlined how I could add additional options by modifying a few functions. But the number of configuration options I was having to add grew far larger than anticipated, and it was getting quite tedious.

It was decided to simplify the process as follows. 

A CSV file contains a list of all the configuration options, as well as each respective option's data length and default value. Here's an example of the format:
```
setting_name,length,default_setting
conn_type,4,none
ssid,33,my_ssid
password,64,my_password
https_domain,64,my.domain.xyz
```

A Python script then reads this CSV file and generates the C files with all the relevant functions. 

Therefore, every time I want to add a new configuration option, I simply edit the CSV file and then run the Python script. Then I erase the Pico's internal flash, rebuild and load the program, and we're up and running with the new configuration file format!

The Python script is quite long since I'm writing large amounts of code with just a few variables here and there being changed based on the contents of the CSV file, so I won't include any snippets here. Here's the [full Python script](https://github.com/tobias-sung/picow-race-timer/blob/main/gen_conf.py) and a sample [CSV file](https://github.com/tobias-sung/picow-race-timer/blob/main/config_fmt.csv). Python's "f-string" feature made formatting the text for the code file very simple.

# Temporary Solution for Garbage Writes
A weird issue was occuring where the configuration text file would get randomly overwritten with garbage characters (�). At first I thought it was because the file was getting overwritten whenever I reloaded the program binary, but it turned out that a random write request would randomly get triggered on startup that wrote garbage into the text file.

Unable to find out what was triggering this garbage write request, I implemented a temporary workaround which was to verify the contents of every write request before allowing it to execute.

I wrote a simple function that takes in a string and checks if there are any non-alphanumerical characters.
```c
int verify_config(const char *str) {
  if (str == NULL) {
    return 0;
  }
  for (int i = 0; str[i] != '\0'; i++) {
	//isalnum() checks if the character is alphanumerical
    if (!isalnum((unsigned char)str[i])) {
        //Allow dots and dashes
        if(str[i] != '-' && str[i] != '.'){
          return 0;
        }
    }
  }
  return 1; 
}
```

Then, in the Write Task:
```c
for (;;){
        xTaskNotifyWait(0, 0, NULL, portMAX_DELAY);
        taskENTER_CRITICAL();
        if(!verify_config(global_config.conn_type) ||
			!verify_config(global_config.ssid) ||
			...)
		{
            debug_print("Garbage characters detected in config file, aborting write\n");
        } else {
            configsetting_write(&global_config);
        }
        taskEXIT_CRITICAL();
    }
```

This solution works, and I'd keep it in even if I were to fix the source of these phantom garbage write requests since it's important to protect the text file in any case. 

Sometimes, when I was modifying the text file and saved my changes, the program would detect garbage characters and refuse to write. For some reason, if I copied the contents of the text file to a blank text editor, made my changes, then copied it back into USB text file, it would work fine. I need to think about a more streamlined process for updating the configuration file.

# References
**Code**
- [Project for reading Wi-Fi settings from TXT file](https://github.com/oyama/pico-msc-wifi-setting)
- ["cdc_msc_freertos" example](https://github.com/hathach/tinyusb/blob/86ad6e56c1700e85f1c5678607a762cfe3aa2f47/examples/device/cdc_msc_freertos/src/main.c)
**Concepts**
- [TinyUSB - A Simple Tutorial](https://www.pschatzmann.ch/home/2021/02/19/tinyusb-a-simple-tutorial/)