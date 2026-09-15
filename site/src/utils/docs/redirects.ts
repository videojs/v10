import type { Guide, Sidebar, SidebarItem, SupportedFramework } from '../../types/docs';
import { isLink, isSection } from '../../types/docs';

export interface DocsRedirect {
  /** Old page path, such as `/docs/framework/html/concepts/cdn`. */
  from: string;
  /** Current page path, such as `/docs/framework/html/reference/cdn`. */
  to: string;
}

interface GuideWithRedirects {
  guide: Guide;
  frameworks: SupportedFramework[];
}

function collectGuides(
  items: SidebarItem[],
  inherited: SupportedFramework[],
  found: GuideWithRedirects[]
): GuideWithRedirects[] {
  for (const item of items) {
    if (isLink(item)) continue;

    const frameworks = item.frameworks ? inherited.filter((fw) => item.frameworks!.includes(fw)) : inherited;

    if (isSection(item)) {
      collectGuides(item.contents, frameworks, found);
    } else if (item.redirectFrom?.length) {
      found.push({ guide: item, frameworks });
    }
  }

  return found;
}

/**
 * Expand every `redirectFrom` in the sidebar into concrete page redirects, one per framework the page renders in. Both
 * the HTML page and its `.md` twin redirect, so agents following a stale llms.txt link land on the moved page too.
 */
export function collectDocsRedirects(sidebar: Sidebar, frameworks: SupportedFramework[]): DocsRedirect[] {
  const redirects: DocsRedirect[] = [];

  for (const { guide, frameworks: guideFrameworks } of collectGuides(sidebar, frameworks, [])) {
    for (const framework of guideFrameworks) {
      const base = `/docs/framework/${framework}`;

      for (const from of guide.redirectFrom ?? []) {
        redirects.push({ from: `${base}/${from}`, to: `${base}/${guide.slug}` });
        redirects.push({ from: `${base}/${from}.md`, to: `${base}/${guide.slug}.md` });
      }
    }
  }

  return redirects;
}

/** Every old slug declared anywhere in the sidebar, for collision checks against live pages. */
export function getRedirectedSlugs(sidebar: Sidebar): string[] {
  return collectGuides(sidebar, [], []).flatMap(({ guide }) => guide.redirectFrom ?? []);
}
