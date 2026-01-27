
document.addEventListener("nav", () => {
  // do page specific logic here

  const carouselTrack = document.getElementById('carouselTrack') as HTMLElement;
  const items = document.querySelectorAll<HTMLElement>('.carousel-item.project-carousel-item');
  const prevBtn = document.getElementById('prevBtn') as HTMLButtonElement;
  const nextBtn = document.getElementById('nextBtn') as HTMLButtonElement;

  const carouselTrack2 = document.getElementById('carouselTrack2') as HTMLElement;
  const items2 = document.querySelectorAll<HTMLElement>('.carousel-item.video-carousel-item');
  const prevBtn2 = document.getElementById('prevBtn2') as HTMLButtonElement;
  const nextBtn2 = document.getElementById('nextBtn2') as HTMLButtonElement;


  function updateCarousel2(): void {
    items2.forEach((item: HTMLElement, index: number) => {
      item.classList.remove('carousel-center');
      console.log("Removed center class from " + index)
      if (index === currentIndex2) {
        console.log("Added center class to " + index)
        item.classList.add('carousel-center');
      }
    });


     // Calculate the offset to center the current item
    const itemWidth: number = items2[currentIndex2].offsetWidth;
    const gap: number = 20;

    // Get the position of the current item
    let offset: number = 0;
    for (let i = 0; i < currentIndex2; i++) {
      offset += items2[i].offsetWidth + gap;
    }

    // Add half of the current item's width to center it
    offset += itemWidth / 2;

    carouselTrack2.style.transform = `translateX(calc(50% - ${offset}px))`;
  }

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

  function nextItem2(): void {
    currentIndex2 = (currentIndex2 + 1) % totalItems2;
    updateCarousel2();
  }

  function prevItem2(): void {
    currentIndex2 = (currentIndex2 - 1 + totalItems2) % totalItems2;
    updateCarousel2();
  }


  let currentIndex: number = 0;
  const totalItems: number = items.length;

  let currentIndex2: number = 0;
  const totalItems2: number = items2.length;
  
  // e.g. attach event listeners
  console.log("Navigated to new page.");
  if (document.body.getAttribute("data-slug") == "index"){
    console.log("On homepage now!")
    currentIndex = 0;
    currentIndex2 = 0;
    updateCarousel();
    updateCarousel2();

    prevBtn.addEventListener('click', prevItem);
    nextBtn.addEventListener('click', nextItem);
    window.addEventListener('resize', updateCarousel);

    prevBtn2.addEventListener('click', prevItem2);
    nextBtn2.addEventListener('click', nextItem2);
    window.addEventListener('resize', updateCarousel2); 

    window.addCleanup(() => {
      nextBtn.removeEventListener('click', nextItem)
      prevBtn.removeEventListener('click', nextItem)
      window.removeEventListener('resize', updateCarousel)

      nextBtn2.removeEventListener('click', nextItem2)
      prevBtn2.removeEventListener('click', nextItem2)
      window.removeEventListener('resize', updateCarousel2)
      
    });
  }
})