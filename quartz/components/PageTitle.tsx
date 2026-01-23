import { pathToRoot, joinSegments } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  const iconPath = joinSegments(baseDir, "static/Site Icon.png")

  return (
    <div class={classNames(displayClass, "header")}>
      <a href={baseDir}><img class="site-icon" src={iconPath}/></a>
      <h2 class={classNames(displayClass, "page-title")}>
      
        <a href={baseDir}>Tobey's Notebook</a>
      </h2>
    </div>
    
  )
}

PageTitle.css = `
.site-icon {
  width: 50px;
}

@media screen and (min-width: 800px) {
  .site-icon {
    width: 200px;
  }
}

.page-title {
  font-size: 1.75rem;
  margin: 0;
  font-family: var(--titleFont);
}

.header {
	display: flex;
	flex-direction: row;
	justify-content:center;
  align-items:center;
  gap: 5px;
}

/* Default styles for all devices (often mobile-first) */
@media screen and (min-width: 800px) {
  .header {
    display: flex;
    flex-direction:column;
    gap:10px;
    align-content:center;
  }
}
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
