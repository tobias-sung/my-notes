---
title: Resume Draft
draft: false
tags:
  -
---
# Skills 專長
**Programming Languages**:
 - C/C++
- Python/MicroPython
- Bash script
**Debuggers**:
Software - GDB
Hardware - Raspberry Pi Debug Probe, XDS110 Debug Probe
**Microprocessor Units (MCU)**:
- Raspberry Pi Pico Family
- Texas Instruments CC13XX MCU Family
**Embedded Operating Systems**:
- Embedded Linux
- TI-RTOS/FreeRTOS
**Embedded Software Development Tools**:
- OpenOCD/pyOCD
- UniFlash
- PulseView (for displaying Logic Analyzer output)
**Development Environments**:
IDE - Visual Studio Code, Code Composer
Toolchains - GCC, CLang
**Project Management**:
Version Control - Git
Code Repositories - GitHub, BitBucket
Documentation - Markdown
# Projects 專案成就
## NB-IoT Water Meter Data Loader
Wrote a **Python** script that: 
1. Downloads data from 8000 NB-IoT water meter devices via OneNET API
2. Organizes and loads the data into an **Elasticsearch** index
Used **recursion**[^1] and **multithreading** to handle the large amount of data[^2].
## TI-RTOS Boot Image Manager
Implemented a **boot image manager** for loading firmware image on a **Texas Instruments CC1312R MCU** running **TI-RTOS**. [^4] Written in **C**.
## Raspberry Pi Z2W: Wake-Up via Real-Time Clock 
Implemented a system for waking up a Raspberry Pi Z2W using a real-time clock [^4] with the following design flow:
1. The Raspberry Pi Z2W sets an alarm on the real-time clock via Bash script and goes to sleep
2. The alarm goes off which triggers an interrupt on a Raspberry Pi Pico, which is running a MicroPython program waiting for such interrupts
3. The Pico sends a signal to the reboot pin of the Z2W, waking it up

## Raspberry Pi Pico W: FreeRTOS Time-Tracking System
Implemented a system for keeping time during a race. This involved:
- Splitting various features into **FreeRTOS tasks** to enable multi-tasking
- Using FreeRTOS' "**Direct-to-Task notification**" system for inter-task communication
- Enabling more convenient settings configuration by exposing the Pico as a USB storage device with an editable text file (using the **TinyUSB** hardware abstraction library)
# 自傳

> [!Note] Sample 自傳 from [104](https://pda.104.com.tw/resumes/HuNJ1UVd2/about?utm_source=oldsite&utm_medium=301)
> 【關於我】
> *好奇心驅動我主動學習*
> 出生於1995年，新北人。自小對世界充滿許多好奇，喜歡待在圖書館，因為閱讀能讓我學習新知識，也能讓我透過書本有不同的人生體悟。也時常為了實現自己的想法，自己主動學習新的技術，例如：小學就開始撰寫部落格，為了使部落格可以呈現出心目中的樣子，便開始學習影像軟體使用與鑽研網路程式語法，使我在國中時就拿到兩張國際證照
> *熱心協助，從中學習* 
> 平時待人親善，遇到他人尋求協助時，我會盡力幫忙。當家中電腦系統或網路出現問題，都是由我出面解決或處理；在研究所時期，也會幫學弟們處理程式BUG，或是給予程式觀念的建議，讓他們可以更順利的解決問題，而我也從中學習經驗。
> 
> 【程式初探，累積實力】
> *培養程式觀念和設計構想*
> 由於從小對程式就充滿熱情，因此在高中就進入補習班，學習HTML、PHP；在大學時期也選擇了相關科系，在大學課程的安排下，我學到更多不同的程式語言，例如：C、C++、JAVA、R、Python等等程式語言，並且以這些程式語言完成了各項的期末專案，例如：鬧鐘占卜APP、學期課表網站，也累積了我對程式的觀念與熟悉。
> 
> 最後我在大學專題「應用深度學習於影像問答之研究」，利用網路資源自行學習影像處理和深度學習，因此累積了我自行學習新程式的能力，利用各網站的理論介紹與github所提供的程式，完成我的大學專題，最後在本系專題展獲得第一名的成績。
> 
> 【技術精進，專攻影像處理與人工智慧】
> *加深技術知識，累積實戰經驗*
> 在研究所期間，我將研究目標專注於影像處理與AI相關領域，因此我研修了人工智慧、機器學習、類神經網路、數位影像處理、電腦視覺等等相關課程，這些課程除了讓我學習到專業知識外，也讓我運用知識做出許多的符合生活需求的作品，例如：車流量計數與車牌辨識、人臉性別辨識、淋巴結切片的組織病理辨識。
> *技術分享，開拓自我視野*
> 在學期間，我將研究資料與實驗結果彙整，投稿致2020臺灣電信年會、NCWIA 2020 台灣網路智能與應用研討會，其論文都有被接受，並放於研討會期刊內。而參加各研討會，也讓我接收最新的各領域的學術知識與相關技術，藉此開拓我的視野。
> 【未來期許】
> *技術整合，加強外語能力*
> 在程式的世界裡，有許多不同領域的知識可以挖掘，希望可以將我的技術結合硬體設備，開發出新的演算法。也希望期待可以增進外語能力，讓自己可以和國外學者或技術人員交流。
> *技發揮所長，跨領域連結*
> 期許未來能夠發揮我的專長與經驗，運用AI和電腦視覺處理技術，在民生相關的居家智能管理，或是工業4.0的自動化產業鏈方面發展，幫公司解決問題與需求。

### About Me
I was born in 2001 in Hong Kong. My parents had moved here from America, and so I grew up speaking English and consider it my native language. My dad was a software engineer and passed down an interest in computers to me. Ever since learning my first programming language, Pascal, in high school I have become fascinated by the beauty of code.   

出生於2001年，香港人。父母是從美國搬過來的，家裏從小到大都是說英文。父親是工程師，是他鼓勵我在中學修讀電腦科。我就是這樣學習我第一個程式語言 Pascal, 從此我就被程式設計的美妙所吸引。

In university, I was introduced to the wider world of programming with languages like C, C++, Java, Python and RISC-V Assembly, along with complex projects that forced us to really put into practice what we learned. 

在大學我接觸了更多的程式語言，例如 C/C++, Java, Python, 連比較低階的語言如RISC-V Assembly 也有寫過。教授都會給我們滿有挑戰性的專案，推動我們把所學的認真地實用。

For my final year project, I worked on an auto-grading system for assessing VHDL assignments. It was an incredible learning experience in which I learned about a wide range of subjects from compiler-level syntax analysis to web design. The report-writing process also made me discover the joy of technical writing, of taking complex subjects and making them simple to understand through clean and concise language.

大學末年，我的專題是研究一個能自動批改VHDL功課的網上平台(我的導師是教VHDL課程的)。這個經驗帶給我的收穫很多，讓我學習了多元的程式設計領域。低階的也有（如編譯器語法分析)，高階的也有 (如網頁設計）。

Outside of school, I began delving deeper into embedded programming through a remote internship I was fortunate enough to receive from Podconn Limited. Although I had great mentors, a lot of my time was spent on my own reading documentation and learning the technology. It put my knowledge management skills to the test, and I built large databases of personal notes and articles using software such as Notion and Obsidian. It also taught me that good programming isn't simply judged by how many lines of code you write, but whether you are willing to take the time to properly read through the documentation to make effective use of pre-existing functions and tools. 

在學校以外，我也通過實習經驗有更深入地學習怎麽寫嵌入式程式。雖然我有很棒的指導，但是我大部分的時間都是自己在閲讀大量的技術手冊，學習怎麽去用龐大的SDK （如 Raspberry Pi Pico, FreeRTOS 等） 去達到程式的目的。這讓我明白寫程式不只是看你寫多少行程式碼，也是看你有沒有耐性認真閲讀去明白怎麽善用手上的科技。

I currently use generative artifical intelligence as a search engine replacement when programming, but I'm excited to learn how to use this this fledgling technology to the fullest to improve the quality of my work and to launch projects that weren't possible before. 

我在未來希望

I also look forward to honing my technical writing skills, whether in English or Chinese, so that I can share my knowledge with the world and improve the clarity of my technical understanding. 


## Original resume
![[Resume.svg]]

[^1]: - Due to limits on how much data could be downloaded in a single API call, large jobs would be split into multiple API calls using recursion

[^2]: - Due to the large amount of data that had to be downloaded and processed, multi-threading (using the `concurrent.futures` Python module) was implemented such that multiple downloads could happen simulatenously.

[^3]:-  Identified a bug where the image header contained an invalid image length, which prevented the boot image manager from loading the firmware image:

[^4]:  It was meant for use in a fish farm monitoring system that would be woken up at certain intervals to collect sensor data
