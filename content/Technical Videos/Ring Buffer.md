Here's the full code for my short series on implementing a Ring Buffer in C. It's my first time doing something like this, so there's sure to be issues with the code but at the very least it works!

I've changed some things from the video, like setting an array index to contain NULL after it's been read by `rb_read()` because it makes the output of `rb_print()` easier to understand. Speaking of which, I also added an `rb_print()` function to print out the buffer and indicate where the read/write pointers are currently at.

In the `main()` function, I wrote a simple test program that runs a `for` loop. In **every** iteration, it **writes** a character from the string variable `msg` to the ring buffer. Every **3rd** iteration, it **reads** from the ring buffer, to simulate a situation where the *writes are happening faster than the reads*.

```c
#include <stdio.h>
#include <string.h>
#include <stdbool.h>
#include <stdlib.h>

#define BUFFER_SIZE 8

typedef struct RingBuf {
    char* rdPtr;
    char* wrPtr;
    char arr[BUFFER_SIZE];
    bool full;
} RingBuf;

void rb_write(RingBuf* rb, char newChar){
    if (rb->full == true){
        rb->rdPtr++;
        if (rb->rdPtr > &(rb->arr[BUFFER_SIZE - 1])){
            rb->rdPtr = (char*) &(rb->arr[0]);
        }
    }
    *(rb->wrPtr) = newChar;
    rb->wrPtr++;
    if (rb->wrPtr > &(rb->arr[BUFFER_SIZE - 1])){
        rb->wrPtr = (char*) &(rb->arr[0]);
    }
    
    if (rb->rdPtr == rb->wrPtr){
        rb->full = true; 
    }
}

char rb_read(RingBuf* rb){
    char val = ' ';
    if (rb->wrPtr != rb->rdPtr || rb->full){
        val = *(rb->rdPtr);
        memset(rb->rdPtr, 0, 1);
        rb->rdPtr++;
        rb->full = false;
        if (rb->rdPtr > &(rb->arr[BUFFER_SIZE - 1])){
            rb->rdPtr = (char*)&(rb->arr[0]);
        }
    }
    return val;
}

void rb_reset(RingBuf* rb){
    rb->wrPtr = (char*) &(rb->arr[0]);
    rb->rdPtr = (char*) &(rb->arr[0]);
    memset(rb->arr, 0, BUFFER_SIZE);
}


RingBuf* rb_init(){
    RingBuf* rb = malloc(sizeof(RingBuf));
    rb_reset(rb);
    return rb;
}

void rb_free(RingBuf* rb){
    free(rb);
}

int rb_space(RingBuf* rb){
    int space = 0;
    if (rb->full == false){
        if (rb->wrPtr >= rb->rdPtr){
            space = BUFFER_SIZE - (rb->wrPtr - rb->rdPtr);
        } else {
            space = rb->rdPtr - rb->wrPtr;
        }
    }
    printf("Space remaining: %d\r\n", space);
    return space;
}

void rb_print(RingBuf* rb){
    for (int i = 0; i < BUFFER_SIZE; i++){
        printf("%c ", rb->arr[i]);
        if (rb->wrPtr == &(rb->arr[i])){
            printf("<- Write Pointer");
        }
        if (rb->rdPtr == &(rb->arr[i])){
            printf("<- Read Pointer");
        }
        printf("\r\n");
    }
}


int main()
{
    RingBuf* rb = rb_init();
    char msg[] = "Rozzum Unit 7134";
    for (int i = 0; i < strlen(msg); i++){
        rb_write(rb, msg[i]);
        printf("Wrote: %c ");
        if (i % 3 == 0){
            printf("Read: %c ", rb_read(rb));
        }
        printf("\r\n");
        rb_print(rb);
        rb_space(rb);
    }


    return 0;
}
```