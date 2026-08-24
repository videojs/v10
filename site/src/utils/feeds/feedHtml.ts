import { parseHTML } from 'linkedom';

/** Markup that is inert (or actively unwanted) once it leaves the site. */
const DROPPED_SELECTORS = ['script', 'style', 'link', 'noscript', 'astro-island'];

/** Wrappers Astro emits around slotted content; the content itself is kept. */
const UNWRAPPED_SELECTORS = ['astro-slot', 'astro-static-slot'];

/**
 * Feeds carry no stylesheet, and `shikiStripPreStyle` removes the background
 * Shiki would have inlined, leaving a dark syntax theme's colors on whatever
 * the reader's background is. Put the site's code-panel background back.
 */
const CODE_BLOCK_STYLE = 'background:#1e1d1d;color:#ebdbb2;padding:1rem;border-radius:4px;overflow-x:auto';

/** Attributes holding a single URL that feed readers resolve against nothing. */
const URL_ATTRIBUTES = ['href', 'src', 'poster'];

function toAbsoluteUrl(value: string, site: URL): string {
  // Fragments and non-navigational schemes (mailto:, data:) have nothing to resolve.
  if (value.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  try {
    return new URL(value, site).href;
  } catch {
    return value;
  }
}

function toAbsoluteSrcset(value: string, site: URL): string {
  return value
    .split(',')
    .map((candidate) => {
      const [url, ...descriptors] = candidate.trim().split(/\s+/);
      if (!url) return candidate.trim();
      return [toAbsoluteUrl(url, site), ...descriptors].join(' ');
    })
    .join(', ');
}

/**
 * Turn page markup into feed markup: drop what a reader cannot run, unwrap
 * Astro's slot placeholders, and make every URL absolute, since a feed item is
 * read far away from the page it came from.
 */
export function cleanFeedHtml(html: string, site: URL): string {
  const { document } = parseHTML(`<!doctype html><html><body><div id="feed-root">${html}</div></body></html>`);
  const root = document.getElementById('feed-root');
  if (!root) return '';

  for (const selector of DROPPED_SELECTORS) {
    for (const node of root.querySelectorAll(selector)) node.remove();
  }

  for (const selector of UNWRAPPED_SELECTORS) {
    for (const node of root.querySelectorAll(selector)) {
      while (node.firstChild) node.parentNode?.insertBefore(node.firstChild, node);
      node.remove();
    }
  }

  for (const element of root.querySelectorAll('[href], [src], [poster], [srcset]')) {
    for (const attribute of URL_ATTRIBUTES) {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, toAbsoluteUrl(value, site));
    }
    const srcset = element.getAttribute('srcset');
    if (srcset) element.setAttribute('srcset', toAbsoluteSrcset(srcset, site));
  }

  for (const pre of root.querySelectorAll('pre')) {
    pre.setAttribute('style', CODE_BLOCK_STYLE);
  }

  return root.innerHTML.trim();
}
