import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';

import { sidebar } from '../src/docs.config';
import type { Sidebar, SupportedFramework } from '../src/types/docs';
import { isLink, isSection, isValidFramework } from '../src/types/docs';

interface PageEntry {
  pathname: string;
  title: string;
  description?: string;
  sort?: string;
  framework?: string;
  markdown?: string;
}

export default function llmsMarkdown(): AstroIntegration {
  let siteUrl = '';
  const turndown = createTurndown();

  return {
    name: 'llms-markdown',
    hooks: {
      'astro:config:done': ({ config }) => {
        siteUrl = config.site?.replace(/\/$/, '') ?? '';
      },
      // Production writes `<page>.md` twins at build time. The dev server has no build step, so convert the rendered
      // page on request instead; this keeps "Copy page" and "View as Markdown" working locally.
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          const pathname = (req.url ?? '').split('?')[0] ?? '';
          if (!pathname.endsWith('.md')) return next();

          const pagePath = pathname.slice(0, -'.md'.length) || '/';

          try {
            const response = await fetch(`http://${req.headers.host}${pagePath}`, { headers: { accept: 'text/html' } });
            if (!response.ok) return next();

            const page = convertPage(await response.text(), turndown, siteUrl);
            if (!page) return next();

            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.end(page.markdown + generatePageFooter(pagePath.slice(1), page.framework, siteUrl));
          } catch (error) {
            next(error);
          }
        });
      },
      'astro:build:done': async ({ dir, pages, logger }) => {
        const siteDir = fileURLToPath(dir);
        // Track pages for their llms.txt indexes
        const docsPages: PageEntry[] = [];
        const blogPages: PageEntry[] = [];
        const changelogPages: PageEntry[] = [];
        const otherPages: PageEntry[] = [];

        logger.info('Generating LLM-optimized markdown files...');

        // Standalone error pages emit e.g. 404.html, not 404/index.html
        const SKIP_PAGES = new Set(['404', '500']);

        async function processPage(pathname: string): Promise<void> {
          if (SKIP_PAGES.has(pathname.replace(/\/$/, ''))) return;

          try {
            // Construct path to HTML file
            const htmlPath = join(siteDir, pathname, 'index.html');
            const html = await readFile(htmlPath, 'utf-8');

            const page = convertPage(html, turndown, siteUrl);
            if (!page) return;

            const { markdown, title, description, sort, framework } = page;

            // Write markdown file as sibling to the directory
            // docs/framework/html/guides/slug -> docs/framework/html/guides/slug.md
            const mdPath = join(siteDir, `${pathname}.md`);
            const footer = generatePageFooter(pathname, framework, siteUrl);

            await mkdir(dirname(mdPath), { recursive: true });
            await writeFile(mdPath, markdown + footer, 'utf-8');

            // Track for llms.txt index (with leading slash for URLs)
            if (pathname.startsWith('docs/')) {
              docsPages.push({ pathname: `/${pathname}`, title, description, sort, framework, markdown });
            } else if (pathname.startsWith('blog/')) {
              blogPages.push({ pathname: `/${pathname}`, title, description, sort });
            } else if (pathname.startsWith('changelog/')) {
              changelogPages.push({ pathname: `/${pathname}`, title, description, sort });
            } else {
              otherPages.push({ pathname: `/${pathname}`, title, description, sort });
            }
          } catch (error) {
            logger.error(`Failed to process ${pathname}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // Process pages with a concurrency cap. Work is mostly CPU-bound
        // (linkedom parse + Turndown) so parallelism only buys overlap with
        // the readFile/writeFile I/O; 8 is enough to keep that overlap busy
        // without flooding the event loop.
        const CONCURRENCY = 8;
        const queue = pages.map((page) => page.pathname);
        const workers = Array.from({ length: CONCURRENCY }, async () => {
          while (queue.length > 0) {
            const pathname = queue.shift();
            if (pathname === undefined) return;

            await processPage(pathname);
          }
        });

        await Promise.all(workers);

        // Group docs by framework
        const docsByFramework = new Map<string, PageEntry[]>();

        for (const doc of docsPages) {
          const fw = doc.framework ?? 'unknown';

          if (!docsByFramework.has(fw)) {
            docsByFramework.set(fw, []);
          }

          docsByFramework.get(fw)!.push(doc);
        }

        // Write per-framework docs sub-indexes
        const frameworks: string[] = [];

        for (const [fw, fwPages] of docsByFramework) {
          frameworks.push(fw);
          const subIndex = generateDocsIndex(fw, fwPages, siteUrl);
          const subIndexPath = join(siteDir, 'docs', 'framework', fw, 'llms.txt');

          await mkdir(dirname(subIndexPath), { recursive: true });
          await writeFile(subIndexPath, subIndex, 'utf-8');

          // One file with every page, for tools that ingest a corpus rather than follow an index.
          const fullPath = join(siteDir, 'docs', 'framework', fw, 'llms-full.txt');

          await writeFile(fullPath, generateDocsFull(fw, fwPages, siteUrl), 'utf-8');
        }

        // Write blog sub-index
        if (blogPages.length > 0) {
          const blogIndex = generateBlogIndex(blogPages, siteUrl);
          const blogIndexPath = join(siteDir, 'blog', 'llms.txt');

          await mkdir(dirname(blogIndexPath), { recursive: true });
          await writeFile(blogIndexPath, blogIndex, 'utf-8');
        }

        // Write changelog sub-index
        if (changelogPages.length > 0) {
          const changelogIndex = generateChangelogIndex(changelogPages, siteUrl);
          const changelogIndexPath = join(siteDir, 'changelog', 'llms.txt');

          await mkdir(dirname(changelogIndexPath), { recursive: true });
          await writeFile(changelogIndexPath, changelogIndex, 'utf-8');
        }

        // Write root llms.txt index
        const rootIndex = generateRootIndex(
          frameworks,
          blogPages.length > 0,
          changelogPages.length > 0,
          otherPages,
          siteUrl
        );
        const rootIndexPath = join(siteDir, 'llms.txt');

        await writeFile(rootIndexPath, rootIndex, 'utf-8');

        const subIndexCount = frameworks.length + (blogPages.length > 0 ? 1 : 0) + (changelogPages.length > 0 ? 1 : 0);

        logger.info(
          `Generated ${docsPages.length + blogPages.length + changelogPages.length + otherPages.length} markdown files, llms.txt root index, and ${subIndexCount} sub-indexes`
        );
      },
    },
  };
}

function createTurndown(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  // Ensure [data-llms-only] content passes through despite hidden attribute
  turndown.addRule('llms-only', {
    filter: (node) => node.nodeType === 1 && (node as Element).getAttribute('data-llms-only') !== null,
    replacement: (content) => content,
  });

  // Wrap [data-cli-replace] content with text markers the CLI can find and replace
  turndown.addRule('cli-replace', {
    filter: (node) => node.nodeType === 1 && (node as Element).getAttribute('data-cli-replace') !== null,
    replacement: (content, node) => {
      const id = (node as Element).getAttribute('data-cli-replace');

      return `\n<!-- cli:replace ${id} -->\n${content}\n<!-- /cli:replace ${id} -->\n`;
    },
  });

  // Wrap [data-cli-omit] content with text markers the CLI strips from its output
  turndown.addRule('cli-omit', {
    filter: (node) => node.nodeType === 1 && (node as Element).getAttribute('data-cli-omit') !== null,
    replacement: (content, node) => {
      const id = (node as Element).getAttribute('data-cli-omit');

      return `\n<!-- cli:omit ${id} -->\n${content}\n<!-- /cli:omit ${id} -->\n`;
    },
  });

  // Shiki renders `<pre data-language>`; keep the language on the fence so agents know what they are reading.
  turndown.addRule('highlighted-code', {
    filter: (node) => node.nodeName === 'PRE' && node.getAttribute('data-language') !== null,
    replacement: (_content, node) => {
      // SAFETY: the filter only matches `<pre>` elements.
      const pre = node as Element;
      const code = (pre.textContent ?? '').replace(/\n$/, '');

      // A fence must be longer than any backtick run inside the code, or a nested ``` would close it early.
      const longestRun = Math.max(2, ...Array.from(code.matchAll(/`+/g), (match) => match[0].length));
      const fence = '`'.repeat(longestRun + 1);

      return `\n\n${fence}${pre.getAttribute('data-language')}\n${code}\n${fence}\n\n`;
    },
  });

  // Flatten docs link cards, whose block markup nests inside the <a>, into list items.
  // Emitting a single leading/trailing newline keeps a run of adjacent cards as one tight list.
  turndown.addRule('docs-link-card', {
    filter: (node) => node.nodeType === 1 && hasClass(node as Element, 'docs-link-card'),
    replacement: (_content, node) => {
      const link = (node as Element).querySelector('a[href]');
      if (!link) return '';

      // Card body is either <span>title</span> or <div><div>title</div><div>description</div></div>,
      // followed by a chevron icon.
      const body = Array.from(link.children).find((child) => child.tagName.toLowerCase() !== 'svg');
      const blocks = body ? Array.from(body.children) : [];
      const hasDescription = blocks.length > 1;

      const title = collapseWhitespace((hasDescription ? blocks[0] : body)?.textContent);
      if (!title) return '';

      const description = hasDescription ? collapseWhitespace(blocks[1]?.textContent) : '';
      const href = link.getAttribute('href') ?? '';

      return description ? `\n- [${title}](${href}): ${description}\n` : `\n- [${title}](${href})\n`;
    },
  });

  return turndown;
}

interface ConvertedPage {
  markdown: string;
  title: string;
  description?: string;
  sort?: string;
  framework?: string;
}

/** Convert a rendered page's `[data-llms-content]` regions to Markdown, or `null` when the page has none. */
function convertPage(html: string, turndown: TurndownService, siteUrl: string): ConvertedPage | null {
  // linkedom is a lightweight DOM-compatible parser — no CSS engine,
  // no script execution, just enough DOM to run querySelector/cloneNode.
  const { document } = parseHTML(html);

  // Check if page has llms content
  const contentElements = document.querySelectorAll('[data-llms-content]');
  if (contentElements.length === 0) return null;

  // For each content element, strip non-content elements before conversion
  const contentParts: string[] = [];

  contentElements.forEach((contentEl) => {
    const clone = contentEl.cloneNode(true) as Element;
    const ignoreElements = clone.querySelectorAll('[data-llms-ignore]');

    ignoreElements.forEach((el) => el.remove());

    // Remove script and style tags (includes Astro island hydration scripts)
    for (const tag of clone.querySelectorAll('script, style')) {
      tag.remove();
    }

    flattenTabs(clone);
    absolutizeUrls(clone, siteUrl);

    contentParts.push(clone.innerHTML);
  });

  // Combine all content parts
  const combinedHtml = contentParts.join('\n\n');
  const markdown = turndown.turndown(combinedHtml);

  // Extract title and description for llms.txt index
  const titleElement = document.querySelector('h1');
  const title = titleElement?.textContent?.trim() || 'Untitled';

  const descriptionAttr = contentElements[0]?.getAttribute('data-llms-description');
  const description = descriptionAttr || undefined;

  const sortAttr = contentElements[0]?.getAttribute('data-llms-sort');
  const sort = sortAttr || undefined;

  const frameworkAttr = contentElements[0]?.getAttribute('data-framework');
  const framework = frameworkAttr || undefined;

  return { markdown, title, description, sort, framework };
}

/**
 * Tab groups render every panel in the HTML, so a Markdown reader would see the tab labels as stray words followed by
 * anonymous blocks. Replace each group with its panels in order, each introduced by its label. A single code frame
 * whose label is just the language keeps only the fence, since the fence already carries it.
 */
function flattenTabs(root: Element): void {
  for (const group of Array.from(root.querySelectorAll('[data-tabs-root]')).reverse()) {
    const labels = new Map<string, string>();

    for (const tab of group.querySelectorAll('[role="tab"]')) {
      labels.set(tab.getAttribute('data-value') ?? '', collapseWhitespace(tab.textContent));
    }

    const panels = Array.from(group.querySelectorAll('[role="tabpanel"]'));
    const parts: string[] = [];

    for (const panel of panels) {
      const label = labels.get(panel.getAttribute('data-value') ?? '') ?? '';
      const language = panel.querySelector('pre[data-language]')?.getAttribute('data-language');
      const showLabel = label && (panels.length > 1 || label !== language);

      if (showLabel) parts.push(`<p><strong>${escapeHtml(label)}</strong></p>`);

      parts.push(panel.innerHTML);
    }

    const replacement = group.ownerDocument.createElement('div');

    replacement.innerHTML = parts.join('\n');
    group.replaceWith(replacement);
  }
}

/** Root-relative links are meaningless once the Markdown leaves the site, so pin them to the canonical origin. */
function absolutizeUrls(root: Element, siteUrl: string): void {
  if (!siteUrl) return;

  for (const link of root.querySelectorAll('a[href^="/"]')) {
    link.setAttribute('href', `${siteUrl}${link.getAttribute('href')}`);
  }

  for (const image of root.querySelectorAll('img[src^="/"]')) {
    image.setAttribute('src', `${siteUrl}${image.getAttribute('src')}`);
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Element.classList is not implemented consistently across DOM shims, so read the attribute directly. */
function hasClass(element: Element, className: string): boolean {
  return (element.getAttribute('class') ?? '').split(/\s+/).includes(className);
}

function collapseWhitespace(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Breadcrumb footer linking a per-page .md back to its parent index and root llms.txt. */
function generatePageFooter(pathname: string, framework: string | undefined, siteUrl: string): string {
  const lines = ['\n\n---\n'];

  if (pathname.startsWith('docs/') && framework) {
    lines.push(`${capitalize(framework)} documentation: ${siteUrl}/docs/framework/${framework}/llms.txt`);
  } else if (pathname.startsWith('blog/')) {
    lines.push(`All blog posts: ${siteUrl}/blog/llms.txt`);
  } else if (pathname.startsWith('changelog/')) {
    lines.push(`Full changelog: ${siteUrl}/changelog/llms.txt`);
  }

  lines.push(`All documentation: ${siteUrl}/llms.txt`);
  return lines.join('\n');
}

/** Breadcrumb footer linking a sub-index back to root llms.txt. */
function generateIndexFooter(siteUrl: string): string {
  return `\n---\n\nAll documentation: ${siteUrl}/llms.txt\n`;
}

function generateRootIndex(
  frameworks: string[],
  hasBlog: boolean,
  hasChangelog: boolean,
  otherPages: PageEntry[],
  siteUrl: string
): string {
  let content = `# Video.js v10\n\n`;

  content += `> Modern video player framework with multi-platform support\n\n`;

  content += `## Documentation\n\n`;

  for (const fw of [...frameworks].sort()) {
    content += `- [${capitalize(fw)} Docs](${siteUrl}/docs/framework/${fw}/llms.txt)`;
    content += ` ([complete in one file](${siteUrl}/docs/framework/${fw}/llms-full.txt))\n`;
  }

  content += `\n`;

  if (hasBlog) {
    content += `## Blog\n\n`;
    content += `- [Blog Posts](${siteUrl}/blog/llms.txt)\n\n`;
  }

  if (hasChangelog) {
    content += `## Changelog\n\n`;
    content += `- [Changelog](${siteUrl}/changelog/llms.txt)\n\n`;
  }

  if (otherPages.length > 0) {
    content += `## Other\n\n`;
    const sorted = [...otherPages].sort((a, b) => a.pathname.localeCompare(b.pathname));

    for (const page of sorted) {
      content += page.description
        ? `- [${page.title}](${siteUrl}${page.pathname}.md): ${page.description}\n`
        : `- [${page.title}](${siteUrl}${page.pathname}.md)\n`;
    }

    content += `\n`;
  }

  return content;
}

function generateDocsIndex(framework: string, pages: PageEntry[], siteUrl: string): string {
  let content = `# Video.js v10 — ${capitalize(framework)} Documentation\n\n`;

  content += `> Every page below is also available as Markdown at its \`.md\` URL. `;
  content += `The whole set in one file: ${siteUrl}/docs/framework/${framework}/llms-full.txt\n\n`;

  // Get sidebar filtered for this framework (production only)
  if (!isValidFramework(framework)) return content;

  const filtered = filterSidebarForLlms(sidebar, framework);

  content += renderSidebarToMarkdown(filtered, pagesBySlug(framework, pages), siteUrl);
  content += generateIndexFooter(siteUrl);

  return content;
}

/** Every docs page for a framework in sidebar order, concatenated into one Markdown document. */
function generateDocsFull(framework: string, pages: PageEntry[], siteUrl: string): string {
  let content = `# Video.js v10 — ${capitalize(framework)} Documentation (complete)\n\n`;

  content += `> Every ${capitalize(framework)} docs page in one file. `;
  content += `Index with descriptions: ${siteUrl}/docs/framework/${framework}/llms.txt\n`;

  // Get sidebar filtered for this framework (production only)
  if (!isValidFramework(framework)) return content;

  const bySlug = pagesBySlug(framework, pages);

  for (const slug of sidebarSlugs(filterSidebarForLlms(sidebar, framework))) {
    const page = bySlug.get(slug);
    if (!page?.markdown) continue;

    content += `\n---\n\n<!-- Source: ${siteUrl}${page.pathname} -->\n\n${page.markdown.trim()}\n`;
  }

  return content;
}

function pagesBySlug(framework: string, pages: PageEntry[]): Map<string, PageEntry> {
  const prefix = `/docs/framework/${framework}/`;
  const pageBySlug = new Map<string, PageEntry>();

  for (const page of pages) {
    if (page.pathname.startsWith(prefix)) {
      const slug = page.pathname.slice(prefix.length).replace(/\/$/, '');

      pageBySlug.set(slug, page);
    }
  }

  return pageBySlug;
}

function sidebarSlugs(items: Sidebar): string[] {
  return items.flatMap((item) => {
    if (isSection(item)) return sidebarSlugs(item.contents);

    return isLink(item) ? [] : [item.slug];
  });
}

function renderSidebarToMarkdown(
  items: Sidebar,
  pageBySlug: Map<string, PageEntry>,
  siteUrl: string,
  depth: number = 0
): string {
  let content = '';

  for (const item of items) {
    if (isSection(item)) {
      const heading = '#'.repeat(depth + 2);

      content += `${heading} ${item.sidebarLabel}\n\n`;

      if (item.llmsDescription) {
        content += `${item.llmsDescription}\n\n`;
      }

      content += renderSidebarToMarkdown(item.contents, pageBySlug, siteUrl, depth + 1);
    } else if (!isLink(item)) {
      const page = pageBySlug.get(item.slug);
      if (!page) continue;

      content += page.description
        ? `- [${page.title}](${siteUrl}${page.pathname}.md): ${page.description}\n`
        : `- [${page.title}](${siteUrl}${page.pathname}.md)\n`;
    }
  }

  if (content.length > 0 && !content.endsWith('\n\n')) {
    content += '\n';
  }

  return content;
}

/**
 * Inline sidebar filter for the integration context where `@/` path aliases aren't available (can't import
 * `filterSidebar` from `src/utils/docs/sidebar`). Filters out `devOnly` items and sections restricted to other
 * frameworks, then removes empty sections.
 */
function filterSidebarForLlms(items: Sidebar, framework: SupportedFramework): Sidebar {
  return items
    .filter((item) => {
      if (item.devOnly) return false;

      return !item.frameworks || item.frameworks.includes(framework);
    })
    .map((item) => {
      if (isSection(item)) {
        return { ...item, contents: filterSidebarForLlms(item.contents, framework) };
      }

      return item;
    })
    .filter((item) => !isSection(item) || item.contents.length > 0);
}

function generateBlogIndex(pages: PageEntry[], siteUrl: string): string {
  return generateChronologicalIndex('Blog', pages, siteUrl);
}

function generateChangelogIndex(pages: PageEntry[], siteUrl: string): string {
  return generateChronologicalIndex('Changelog', pages, siteUrl);
}

function generateChronologicalIndex(title: string, pages: PageEntry[], siteUrl: string): string {
  let content = `# Video.js v10 — ${title}\n\n`;
  // Newest first
  const sorted = [...pages].sort((a, b) => {
    if (a.sort && b.sort) {
      return b.sort.localeCompare(a.sort);
    }

    return b.pathname.localeCompare(a.pathname);
  });

  for (const post of sorted) {
    content += post.description
      ? `- [${post.title}](${siteUrl}${post.pathname}.md): ${post.description}\n`
      : `- [${post.title}](${siteUrl}${post.pathname}.md)\n`;
  }

  content += generateIndexFooter(siteUrl);
  return content;
}
