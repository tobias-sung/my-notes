---
title: Welcome!
---
Hello! My name is Tobias, and I'm an aspiriring software engineer (click [[📜 About Me|here]] if you'd like to know more about me). 

This website is a place for me to keep notes on all the projects I've worked on. 

I strongly believe in the importance of personal documentation in programming. As the famous saying goes, *"When I wrote this code, only God and I understood what I did. Now only God knows."* Hence the need to **write things down**!

Here's some of the latest projects I've worked on:



<script>
const carouselTrack = document.getElementById('carouselTrack');
const items = document.querySelectorAll('.carousel-item');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
let currentIndex = 0;
const totalItems = items.length;

function updateCarousel() {
items.forEach((item, index) => {
item.classList.remove('center');
if (index === currentIndex) {
item.classList.add('center');
}
});

  

// Calculate the offset to center the current item
const itemWidth = items[currentIndex].offsetWidth;
const gap = 20;

// Get the position of the current item
let offset = 0;
for (let i = 0; i < currentIndex; i++) {
offset += items[i].offsetWidth + gap;
}

// Add half of the current item's width to center it
offset += itemWidth / 2;
carouselTrack.style.transform = `translateX(calc(50% - ${offset}px))`;
}

  

prevBtn.addEventListener('click', () => {

currentIndex = (currentIndex - 1 + totalItems) % totalItems;

updateCarousel();

});

  

nextBtn.addEventListener('click', () => {

currentIndex = (currentIndex + 1) % totalItems;

updateCarousel();

});

  

// Initialize
updateCarousel();
// Recalculate on window resize
window.addEventListener('resize', updateCarousel);
</script>

<div class="carousel-container">

<div class="carousel-wrapper" id="carousel">

<div class="carousel-track" id="carouselTrack">

<div class="carousel-item">
<a href="https://tobias-sung.github.io/my-notes/Project-Portos/9---Writing-a-Pico-PIO-I2C-driver-for-the-VL535CX-ToF-Distance-Sensor" class="carousel-link" target="_top">
<img src="../Images/Guidance.png" alt="Project 1" class="carousel-image">
</a>
<p class="carousel-caption">Modified Distance Sensor Driver for the Pico</p>
</div>

<div class="carousel-item">
<a href="https://example.com/project2" class="carousel-link" target="_top">
<img src="../Images/Emotional.png" alt="Project 2" class="carousel-image">
</a>
<p class="carousel-caption">Mobile App Design</p>
</div>

<div class="carousel-item">
<a href="https://example.com/project2" class="carousel-link" target="_top">
<img src="../Images/Emotional.png" alt="Project 2" class="carousel-image">
</a>
<p class="carousel-caption">Mobile App Design</p>
</div>

<div class="carousel-item">
<a href="https://example.com/project2" class="carousel-link" target="_top">
<img src="../Images/Emotional.png" alt="Project 2" class="carousel-image">
</a>
<p class="carousel-caption">Mobile App Design</p>
</div>

</div>

</div>

  

<div class="nav-buttons">

<button class="nav-button" id="prevBtn">←</button>

<button class="nav-button" id="nextBtn">→</button>

</div>

</div>


