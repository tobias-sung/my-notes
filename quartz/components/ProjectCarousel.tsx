import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import script from "./scripts/carousel.inline"

export default (() => {
  const ProjectCarousel: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    /* if (fileData.slug !== "index" || fileData.slug !== ""){
      return null
    } */
    
  }

  ProjectCarousel.afterDOMLoaded = script

  ProjectCarousel.css = `

    .carousel-container {
      max-width: 1200px;
      margin: 0 auto;
      position: relative;
    }


  .carousel-container::before,
  .carousel-container::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 100px; /* Adjust fade width */
    pointer-events: none;
    z-index: 1;
  }

  .carousel-container::before {
    left: 0;
    background: linear-gradient(to right, 
      rgba(227, 224, 215, 1) 0%, 
      rgba(227, 224, 215, 0) 100%);
  }

  .carousel-container::after {
    right: 0;
    background: linear-gradient(to left, 
      rgba(227, 224, 215, 1) 0%, 
      rgba(227, 224, 215, 0) 100%);
  }

    .carousel-wrapper {
      display: flex;
      gap: 20px;
      padding: 40px 0;
      overflow: hidden;
      position: relative;
      justify-content: center;
    }
    
    .carousel-track {
      display: flex;
      gap: 20px;
      transition: transform 0.5s ease;
    }

    .carousel-wrapper::-webkit-scrollbar {
      display: none;
    }
    
    .carousel-wrapper {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    
    .carousel-item {
      flex: 0 0 auto;
      transition: transform 0.5s ease, opacity 0.5s ease;
      opacity: 0.6;
      transform: scale(0.85);
      display: flex;           
      flex-direction: column;  
      align-items: center;   

    }

    .carousel-item.carousel-center {
      opacity: 1;
      transform: scale(1);
    }

    .carousel-link {
      display: block;
      text-decoration: none;
      color: inherit;
    }

    .carousel-image {
      width: 300px;
      height: 200px;
      object-fit: cover;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: box-shadow 0.3s ease;
      cursor: pointer;
    }

    .carousel-item.center .carousel-image {
      width: 400px;
      height: 267px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }

    .carousel-link:hover .carousel-image {
      box-shadow: 0 6px 12px rgba(0,0,0,0.15);
    }

    .carousel-item.carousel-center .carousel-link:hover .carousel-image {
      box-shadow: 0 12px 24px rgba(0,0,0,0.25);
    }

    .carousel-caption {
      text-align: carousel-center;
      margin-top: 12px;
      font-size: 14px;
      color: #333;
      max-width: 300px;
    }

    .carousel-item.carousel-center .carousel-caption {
      max-width: 400px;
      font-size: 16px;
      font-weight: 500;
    }

    .nav-buttons {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 20px;
    }

    .nav-button {
      background: #333;
      color: white;
      border: none;
      padding: 12px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 20px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s ease;
    }

    .nav-button:hover {
      background: #555;
    }
  `

  return ProjectCarousel
}) satisfies QuartzComponentConstructor 
