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

I started by getting the inputs for [[Write-Up 2 - UART Communication|UART]] (for entering text commands and registering a new track/car) and [[Write-Up 3 - GPIO Button Input|GPIO]] (for the push buttons representing race events) working. 

Then I implemented [[Write-Up 4 - TCP Client|TCP client functionality]], as intially the server controlling the Web UI was a simple TCP server with no application layer security.

Later, the server was upgraded to be an HTTPS server with Transport Layer Security (TLS). So I implemented [[Write-Up 5 - HTTPS Client|HTTPS client functionality]].

With the main features completed, I added two extra ones to make the system more convenient. The first was to add an [[Write Up 6 - OLED screen|small OLED screen]] that printed out console messages. The second was to have the Pico W [[Write Up 7 - Reading from TXT File|read configuration information from a text file]].  



