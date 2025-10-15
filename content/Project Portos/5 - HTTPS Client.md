---
title: 5 - HTTPS Client
draft: false
tags:
  -
---
*[View the full code on GitHub](https://github.com/tobias-sung/picow_freertos_tls_client)*

The next part of the project was to get the Pico W to connect to an HTTPS server with TLS (Transport Layer Security). Functionally, it's exactly the same as the [[4 - TCP Client|previous section]], it's just that after the TCP handshake is completed an additional TLS handshake is carried out to verify the authenticity of the server. Accordingly, the lwIP developers have made their "altcp" API library very similar to the "tcp" API library in terms of naming and structure.

The HTTPS server was already setup by the team  and recognizes specific text messages like "RESET_OK", which will trigger changes in a Web UI. Regradless of whether it recognized the text message, it sends back an HTTP 200 response to indicate the message was successfully received. So unlike the [[4 - TCP Client|previous section]], I didn't set up my own test server.

I used the ["tls_client" example](https://github.com/raspberrypi/pico-examples/tree/master/pico_w/wifi/tls_client) from the "pico-example" GitHub repository as a starting point. The example simply sends a single TLS request before closing the connection. Once again, I'll modify it to keep the connection open indefinitely and send messages inputted via UART. 

# Copying Over The Code
## lwIP Application Layer configurations
I copied over a few extra configuration options for "lwipopts.h" that are unique to the TLS client project.

```c
/* TCP WND must be at least 16 kb to match TLS record size
   or you will get a warning "altcp_tls: TCP_WND is smaller than the RX decrypion buffer, connection RX might stall!" */
#undef TCP_WND
#define TCP_WND  16384

#define LWIP_ALTCP               1
#define LWIP_ALTCP_TLS           1
#define LWIP_ALTCP_TLS_MBEDTLS   1

#define LWIP_DEBUG 1
#define ALTCP_MBEDTLS_DEBUG  LWIP_DBG_ON
```
****
I then copied ["tls_common.c"](https://github.com/raspberrypi/pico-examples/blob/master/pico_w/wifi/tls_client/tls_common.c) which defines the TLS client object, callbacks and setup functions .
## TLS Client Object 
I removed a few of the values of the TLS Client structure, simplifying it to be: 
```c
typedef struct TLS_CLIENT_T_ {
    struct altcp_pcb *pcb; //Protocol Control Block
    bool connected; //Connection status (True or False)
    int error; //Error code
    int timeout; //Time before connection timeout
} TLS_CLIENT_T;
```
## Callback Functions
"tls_common.c" contains the following callbacks, most of which have equivalent functions in the TCP client API:
- `tls_client_sent()`
- `tls_client_connected()` 
- `tls_client_poll()`
- `tls_client_err()`
- `tls_client_recv()`
- `tls_client_dns_found()` (this one is unique to the TLS client, triggering when the server domain name has been resolved into an IP address)
## Setup functions
`tls_client_init()` initializes the TLS client while `tls_client_open()` establishes the connection.
****
Finally, in `run_tls_client_test()` I uncommented this line of code: 
```c
mbedtls_ssl_conf_authmode(&tls_config->conf, MBEDTLS_SSL_VERIFY_REQUIRED);
```

The first parameter is `tls_config`, the TLS client's configuration handle. The second configures which authentication mode will be used. By using `MBEDTLS_SSL_VERIFY_REQUIRED`, I set the TLS handshake to fail should the server's SSL ceritficate not pass authentication against a root certificate I'll define in my code later. 

After uncommenting `mbedtls_ssl_conf_authmode()`, I was getting this error when building the program: `invalid use of undefined type 'struct altcp_tls_config'`. I searched through the Pico SDK files for references to `struct altcp_tls_config` and eventually found the definition in "pico-sdk/lib/lwip/src/apps/altcp_tls/altcp_tls_mbedtls.c": 

```c
struct altcp_tls_config {
  mbedtls_ssl_config conf;
  mbedtls_x509_crt *cert;
  mbedtls_pk_context *pkey;
  u8_t cert_count;
  u8_t cert_max;
  u8_t pkey_count;
  u8_t pkey_max;
  mbedtls_x509_crt *ca;
}; 
```

I copied it over into "tls_common.c" which finally made it build.
# Root Certificate
I was given a root certificate that would certify the HTTPS server (defined as a macro at the start of the code using `#define`). In order to test that the authentication worked, I also copied two root certificates from ["tls_verify.c"](https://github.com/raspberrypi/pico-examples/blob/master/pico_w/wifi/tls_client/tls_verify.c) in the "tls_client" example to make sure that the TLS handshake only passed using the root certificate that I was given.

# Writing a function for sending data
I then wrote a function to send text message to the HTTPS server. I first created a character array and formatted the HTTP request using `snprintf()`:
```c
bool tls_send(char message[]){
     
    char request_buffer[256];
    
    int request_len = snprintf(request_buffer, sizeof(request_buffer),
                    "POST %s HTTP/1.1\r\n"
                    "Host: %s\r\n"
                    "Content-Type: text/plain\r\n"
                    "Content-Length: %zu\r\n"
                    "\r\n"
                    "%s",
                    "/api/race", TLS_CLIENT_SERVER, strlen(message), message);

```

Then sending the message itself:
```c
	cyw43_arch_lwip_begin();

    int err = altcp_write(tls_client->pcb, (const char*)request_buffer, request_len, TCP_WRITE_FLAG_COPY);

    if (err != ERR_OK) {
        printf("error writing data, err=%d", err);
        return tls_client_close(tls_client);
    }

    altcp_output(tls_client->pcb);

    cyw43_arch_lwip_end();
```

Much like in the TCP example, we have to first call `altcp_write()` to write the data that is to be sent, then call `altcp_output()`  to trigger the actual sending of the message. 

# Result
I integrated the UART input code in the same way I did in the [[4 - TCP Client|TCP section]] (copying over the relevant task/functions and modifying the task to call `tls_send()` when it detects an 
ENTER). 

Before starting the scheduler, I added `tls_send("Hello")` to send a dummy message to the HTTPS server, because if no message is sent within 10 seconds the server shuts down the connection.

And the result in mincom is ("testing" being the text I inputted via UART):
![[Pasted image 20250912155759.png]]

# Dependencies
"CMakeLists.txt": 
- Added `pico_mbedtls` and `pico_lwip_mbedtls` to `target_link_libraries()` section
- Added `tls_common.c` to `add_executable()` section

# Further Notes
- Initially the program wouldn't build because of "undefined references" to functions like `altcp_arg()` and `altcp_recv()`, which should be included in the lwIP TLS library. I didn't understand why this was happening, because I had clearly included the library packages `pico_mbedtls` and `pico_lwip_mbedtls` in "CMakeLists.txt". Turns out I forgot to copy the extra configurations for TLS connections into "lwipopts.h".

# References
**Documentation**
- [lwIP application-layered TCP Introduction](https://www.nongnu.org/lwip/2_1_x/group__altcp__api.html)
- [lwIP application-layered TCP Functions documentation](https://www.nongnu.org/lwip/2_1_x/group__altcp.html)
- [mbedtls API Documentation](https://mbed-tls.readthedocs.io/projects/api/en/development/)
**Concepts**
- [What Happens in a TLS Handshake](https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/)
- ["tls_verify" example](https://github.com/raspberrypi/pico-examples/blob/master/pico_w/wifi/tls_client/tls_verify.c)
- [What are Root Certificates?](https://www.ssl.com/article/what-are-root-certificates-and-why-do-they-matter/)
