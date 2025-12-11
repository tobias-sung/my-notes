/* prevBtn.addEventListener('click', prevItem);

nextBtn.addEventListener('click', nextItem);

// Initialize
updateCarousel();

// Recalculate on window resize
window.addEventListener('resize', updateCarousel);

window.addCleanup(() => {
  //nextBtn.removeEventListener('click', nextItem)
  //prevBtn.removeEventListener('click', nextItem)
  //window.removeEventListener('resize', updateCarousel)
}) */

document.addEventListener("nav", () => {
  // do page specific logic here

  const carouselTrack = document.getElementById('carouselTrack') as HTMLElement;
  const items = document.querySelectorAll<HTMLElement>('.carousel-item');
  const prevBtn = document.getElementById('prevBtn') as HTMLButtonElement;
  const nextBtn = document.getElementById('nextBtn') as HTMLButtonElement;

  function updateCarousel(): void{
    console.log("Updating carousel.")
    items.forEach((item: HTMLElement, index: number) => {
      item.classList.remove('carousel-center');
      console.log("Removed center class from " + index)
      if (index === currentIndex) {
        console.log("Added center class to " + index)
        item.classList.add('carousel-center');
      }
    });
     // Calculate the offset to center the current item
    const itemWidth: number = items[currentIndex].offsetWidth;
    const gap: number = 20;

    // Get the position of the current item
    let offset: number = 0;
    for (let i = 0; i < currentIndex; i++) {
      offset += items[i].offsetWidth + gap;
    }

    // Add half of the current item's width to center it
    offset += itemWidth / 2;

    carouselTrack.style.transform = `translateX(calc(50% - ${offset}px))`;
  } 
  

  function nextItem(): void {
    currentIndex = (currentIndex + 1) % totalItems;
    updateCarousel();
  }

  function prevItem(): void {
    currentIndex = (currentIndex - 1 + totalItems) % totalItems;
    updateCarousel();
  }


  let currentIndex: number = 0;
  const totalItems: number = items.length;
  // e.g. attach event listeners
  console.log("Navigated to new page.");
  if (document.body.getAttribute("data-slug") == "index"){
    console.log("On homepage now!")
    currentIndex = 0;
    updateCarousel();
    prevBtn.addEventListener('click', prevItem);
    nextBtn.addEventListener('click', nextItem);
    window.addEventListener('resize', updateCarousel)
    window.addCleanup(() => {
      nextBtn.removeEventListener('click', nextItem)
      prevBtn.removeEventListener('click', nextItem)
      window.removeEventListener('resize', updateCarousel)
    })
  }
})