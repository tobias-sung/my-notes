---
title: 1 - Introduction
draft: false
tags:
  -
---
*[View the full code on GitHub](https://github.com/tobias-sung/picow-race-timer)*

This documents the process of working on a FreeRTOS program written in C for the Raspberry Pico W. The program is used for tracking the time during a toy car race. The following diagram provides a simple overview of the program, where blue refers to output from the Pico W and green refers to inputs: 
![[Project Overview.excalidraw.png]]

Each track and its respective car are registered into the system via information inputted via the UART interface. During development, buttons were used to simulate race events such as the starting of a race and when a car crosses the finish line. 

The Pico W sends messages to a server every time a new track/car is registered as well as when important race events occur. The server then updates a Web UI that displays the status of the race.

Here's the process of development (with links to posts detailing each step):

1. Developing a [[2 - UART Communication|UART console]] for entering text commands 
2. Connecting [[3 - GPIO Button Input|push buttons]] via GPIO for simulating race events
3. Implementing [[4 - TCP Client|TCP client functionality]] for connecting to a TCP server 
4. Implementing [[5 - HTTPS Client|TLS client functionality]] for connecting to an HTTPS server with Transport Layer Security.

With the main features completed, I added 3 extra features:

5. Connecting a [[6 - OLED screen|small OLED screen]] for printing out messages
6. Reading configuration options from a [[7 - Reading from Configuration File|text file in internal flash]].  
7. Display [[8 - Power Monitoring|power status]] on OLED screen

For clarity, I've separated each feature into its own project, with the GitHub link provided at the start of each article. 

