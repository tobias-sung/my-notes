import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import script from "./scripts/carousel.inline"
import style from "./styles/carousel.scss"
export default (() => {
  const ProjectCarousel: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    /* if (fileData.slug !== "index" || fileData.slug !== ""){
      return null
    } */

    
  }

  ProjectCarousel.afterDOMLoaded = script

  ProjectCarousel.css = style

  return ProjectCarousel
}) satisfies QuartzComponentConstructor 
