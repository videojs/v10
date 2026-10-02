import { SEO_SUFFIX, SITE_TITLE } from '@/consts';

/** Compose a page title without duplicating the Video.js brand segment. */
export function buildPageTitle(title: string | string[], suffix?: string | false): string {
  const seoSuffix = suffix === false ? null : (suffix ?? SEO_SUFFIX);
  const pageTitle = Array.isArray(title) ? title.join(' | ') : title;
  const includesSiteTitle = pageTitle === SITE_TITLE || pageTitle.endsWith(` | ${SITE_TITLE}`);
  if (includesSiteTitle) return seoSuffix ? `${pageTitle} | ${seoSuffix}` : pageTitle;

  return seoSuffix ? `${pageTitle} | ${SITE_TITLE} | ${seoSuffix}` : `${pageTitle} | ${SITE_TITLE}`;
}
