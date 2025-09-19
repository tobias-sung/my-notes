---
title: Write-Up 1 - Introduction
draft: false
tags:
  -
---
![[Pasted image 20250912165442.png]]

This documents the process of working on a FreeRTOS program written in C for the Raspberry Pico W. The program is used for tracking the time during a toy car race.

Each track and its respective car are registered into the system via information inputted via the UART interface. During development, buttons were used to simulate events such as the starting of a race and a car crossing the finish line. 

The Pico W sends messages to a server every time a new track/car is registered as well as when important race events occur. The server then updates a Web UI that displays the status of the race (pictured below):

![[Pasted image 20250912165109.png]]

Here's the process of development (with links to posts detailing each step):

1. Developing a [[Write-Up 2 - UART Communication|UART console]] for entering text commands 
2. Connecting [[Write-Up 3 - GPIO Button Input|push buttons]] via GPIO for simulating race events
3. Implementing [[Write-Up 4 - TCP Client|TCP client functionality]] for connecting to a TCP server 
4. Implementing [[Write-Up 5 - HTTPS Client|TLS client functionality]] for connecting to an HTTPS server with Transport Layer Security.

With the main features completed, I added two extra features:

5. Connecting a [[Write-Up 6 - OLED screen|small OLED screen]] for printing out messages
6. Reading configuration options from a [[Write-Up 7 - Reading from TXT File|text file in internal flash]].  



