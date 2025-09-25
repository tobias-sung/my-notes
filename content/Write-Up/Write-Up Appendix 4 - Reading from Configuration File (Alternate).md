Before settling on the final [[Write-Up 7 - Reading from Configuration File|solution]] for reading from a configuration file, I had experimented with loading a binary file onto the Pico W's internal flash via OpenOCD/pyOCD's flash commands, and then reading its contents using C's memory functions. 

# Loading The Binary File
First, I created a file named "config" with some text inside:
```shellscript
sudo nano config
```



