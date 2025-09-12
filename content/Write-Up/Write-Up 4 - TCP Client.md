---
title: Write-Up 4 - TCP Client
draft: false
tags:
  -
---
The goal now is to get the Pico W to connect to a TCP server and send the messages typed in by the user through the [[Write-Up 2 - UART Communication]]. 

The TCP client functionality was implemented using the ["tcp_client" example](https://github.com/raspberrypi/pico-examples/tree/master/pico_w/wifi/tcp_client) from the "pico-examples" GitHub repository as a base. The original example sends random data back and forth between the Pico W and a local Python server a fixed number of times in a for-loop, ending the connection once the transfers are completed. For my program, I want to keep the connection open indefinitely and send messages inputted via UART whenever the user presses ENTER.

# Copying Over The Code
I created a file called `lwipopts.h`, which holds configuration options for the lwIP library. Then I copied the contents of ["lwipopts_example_common.h"](https://github.com/raspberrypi/pico-examples/blob/master/pico_w/wifi/lwipopts_examples_common.h) from the "pico-examples" GitHub repo into this file. 

Then I went over the main code of the example to see which essential code blocks needed to be copied over.
## TCP Client Object

The TCP client object is represented by a structure as defined below (I removed several values from the structure that weren't necessary for my project): 
```C
typedef struct TCP_CLIENT_T_ {
    struct tcp_pcb *tcp_pcb; //Process Control Block
    ip_addr_t remote_addr; //IP Address of TCP Server (to be connected to)
    bool connected; //Connection status (True or False)
} TCP_CLIENT_T;

TCP_CLIENT_T* client;
```

## TCP Initialization and De-Initialization functions
I copied the following functions from the [example](https://github.com/raspberrypi/pico-examples/blob/master/pico_w/wifi/tcp_client/picow_tcp_client.c) verbatim with no changes:
- `tcp_client_init()`: Initializes the TCP client object and sets `remote_addr` property to be the IP address of the TCP server it needs to connect to 
- `tcp_client_close()`: Ends the connection and resets the TCP client object 

## TCP Callback functions
There are several callback functions that need to be implemented in the code which I also copied mostly verbatim from the [example](https://github.com/raspberrypi/pico-examples/blob/master/pico_w/wifi/tcp_client/picow_tcp_client.c):
- `tcp_client_sent()`: When the TCP client sends a message
- `tcp_client_connected()`: When the TCP client establishes connection with the server
- `tcp_client_poll()`: When the TCP client polls the server
- `tcp_client_err()`: When an error occurs in the TCP connection
- `tcp_client_recv()`: When the TCP client receives a message from the server

I only made an alteration to `tcp_client_recv()` so that it wouldn't echo back the data it received to the server. 

I also replaced all references to `tcp_client_result()` with `tcp_client_close()` just to make the code simpler.

Finally, I deleted the `printf()` statement in `tcp_client_poll` because it wasn't particularly useful.

# Connecting to Wi-Fi and Establishing TCP Connection
With all the TCP client setup done, I could start testing it out. But before I could do anything, I'd have to connect the Pico W to the Internet (the feature that separates it from the regular old Pico).

The problem was that sometimes it would fail to connect to Wi-Fi on the first attempt, and after getting frustrated with having to restart the Pico W once or twice to successfully connect, I had the Pico W automatically try to reconnect 5 times before it gives up:
```C
int attempts = 0;
//Connect to WiFi. Stops trying to reconnect after 5 failed attempts
while (cyw43_arch_wifi_connect_timeout_ms(WIFI_SSID, WIFI_PASSWORD, CYW43_AUTH_WPA2_AES_PSK, 10000) && attempts < 5) {
    printf("Failed to connect to Wi-Fi. Retrying...\n");
    attempts++;
} 

int status = cyw43_tcpip_link_status(&cyw43_state, CYW43_ITF_STA);
if (status == CYW43_LINK_UP) {
    printf("Connected to Wifi!\n");
}
```

After initializing the TCP client using `tcp_client_init()`, I just copied over the function `tcp_client_open()` from the example, which takes care of establishing the TCP connection.

Once that was done, I tested the program out and got the following output in minicom indicating that the connection was a success.

![[Pasted image 20250909122402.png|400]]

On my local Python server:
![[Pasted image 20250909122824.png|400]]
# Sending Messages to Server
I wrote the following function to send text messages to the TCP server.
```C
void tcp_send(char message[]){   
    cyw43_arch_lwip_begin();
    
    err_t err = tcp_write(client->tcp_pcb, message, strlen(message), TCP_WRITE_FLAG_COPY);
    if (err != ERR_OK) {
        printf("Failed to write data %d\n", err);
        return;
    }
    tcp_output(client->tcp_pcb);
            
    cyw43_arch_lwip_end(); 
}
```

Here, `tcp_write()` puts the data to be sent into a queue but doesn't send it right away. It's `tcp_output()` that is responsible for starting the send process . 

The lwIP API calls are bracketed by `cyw43_arch_lwip_begin()` and `cyw43_arch_lwip_end()` to ensure the proper locks are acquired for successful completion, as the lwIP API is not threadsafe.
# Integrating with UART console
Now, I could integrate the TCP client code with the code I had written previously for UART input. 

It was simply a matter of copying `vUARTCallback()`, `UART_setup()` and `vUARTTask()`, then adding `vUARTTask()` to the Scheduler. In addition, I modified `vUARTTask()`'s response to detecting an ENTER key so that it would call `tcp_send()` with the buffer contents as the input parameter.

There was a little issue where after I sent one message to the TCP server, the program would freeze and nothing would happen. By using the Raspberry Pi debug probe, I eventually realized that a stack overflow was occuring and the issue was fixed by allocating more stack depth to `vUARTTask()`. 

So from:
```C
xTaskCreate(vUARTTask, "UART Task", 256,  NULL, 1, NULL);
```
to
```C
xTaskCreate(vUARTTask, "UART Task", 512,  NULL, 1, NULL);
```

And here's the result:
![[Pasted image 20250909131743.png]]

# Further Notes
- I adapted the Python TCP server from this [example](https://medium.com/@mando_elnino/python-tcp-server-b945c68a983c) but modified it to maintain the connection indefinitely. Adding `{socket_name}.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)` after initializing the socket helped me to immediately restart the server after closing it with CTRL-C without encountering the "Address already in use" error.
- For the Wi-Fi SSID and password, I simply defined two macros `WIFI_SSID` and `WIFI_PASSWORD` at the beginning of the code. This makes it a bit inconvenient to configure as it would require re-building the entire program. I would later replace this with reading from a text file.
# References
**Documentation**
- [lwIP TCP API documentation](https://www.nongnu.org/lwip/2_0_x/group__tcp__raw.html)















 
