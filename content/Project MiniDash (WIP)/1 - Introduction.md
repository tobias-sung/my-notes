---
title: 1 - Introduction
draft: false
tags:
  -
---

I bought a new little desk shelf and thought it would be cool to have a little clock there. This little thought eventually grew into an idea to have an e-ink dashboard that could show stuff like a calendar, the weather, inspiring quotes, to-do lists and so on. 

![[Pasted image 20260203103535.png]]

# The Display - Pico CapTouch ePaper 2.9

![[Pasted image 20260203103423.png]]

I did some research and found the [Pico-CapTouch-ePaper-2.9](https://www.waveshare.com/wiki/Pico-CapTouch-ePaper-2.9) display, which was initially a bit too small for my taste (2.9 inches isn't a lot of real estate) but the fact that it had touch sensors was what sealed the deal from me, because it meant I could implement a larger range of features (like flipping between different pages). And the driver board comes equipped with a pre-soldered female header, meaning I can just plug my Raspberry Pi Pico right in without needing to use any jumper wires.   
# The Power Supply - UPS Module with 600mAh LiPo Battery

![[Pasted image 20260203103438.png]]

I didn't want to have to keep the display plugged in all the time, and so I looked for a solution to power the Pico and the e-ink display using a battery. I found that a common way of keeping a Raspberry Pi powered even when it isn't plugged in is by using an Uninterruptible Power Supply (UPS module), though these seem to be mainly used for **temporarily** powering a Pi when moving it from one place or another, or during short power outages. Considering how little power e-ink displays consume though, I'm hopeful that the battery can last for a significant amount of time.

# Putting It All Together - No Stand Required!

![[Pasted image 20260203103457.png|350]]

The best part about using male/female headers to connect everything is that it gives the e-ink display a kind of makeshift stand! 

I plugged the UPS module's pins into the CapTouch's female header, and then I plugged the Pico's pins into the UPS moudle's female header. And just like that, I have a stand!




