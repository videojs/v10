import { SEO_SUFFIX, SITE_TITLE } from '@/consts';

export interface PageTitleOptions {
  /** SEO suffix appended after the brand. Pass `false` to omit it. */
  suffix?: string | false;
  /** Site section folded into the brand segment, e.g. `Blog` → `Post | Video.js Blog`. */
  section?: string;
}

/**
 * Compose a page title without duplicating the brand segment. A page titled exactly after its section (e.g. the blog
 * index) collapses into the brand: `Video.js Blog | …`.
 */
export function buildPageTitle(title: string | string[], options: PageTitleOptions = {}): string {
  const { suffix, section } = options;
  const seoSuffix = suffix === false ? null : (suffix ?? SEO_SUFFIX);
  const brand = section ? `${SITE_TITLE} ${section}` : SITE_TITLE;

  const pageTitle = Array.isArray(title) ? title.join(' | ') : title;
  const segments =
    pageTitle === brand || pageTitle === section
      ? [brand]
      : pageTitle.endsWith(` | ${brand}`)
        ? [pageTitle]
        : [pageTitle, brand];

  if (seoSuffix) segments.push(seoSuffix);

  return segments.join(' | ');
}
