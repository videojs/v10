import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

import { sidebar } from '../src/docs.config';
import type { Sidebar, SupportedFramework } from '../src/types/docs';
import { isSection, isValidFramework } from '../src/types/docs';

interface PageEntry {
  pathname: string;
  title: string;
  description?: string;
  sort?: string;
  framework?: string;
}

export default function llmsMarkdown(): AstroIntegration {
  let siteUrl = '';

  return {
    name: 'llms-markdown',
    hooks: {
      'astro:config:done': ({ config }) => {
        siteUrl = config.site?.replace(/\/$/, '') ?? '';
      },
      'astro:build:done': async ({ dir, pages, logger }) => {
        const siteDir = fileURLToPath(dir);
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

        // Track all docs and blog pages for llms.txt index
        const docsPages: PageEntry[] = [];
        const blogPages: PageEntry[] = [];
        const otherPages: PageEntry[] = [];

        logger.info('Generating LLM-optimized markdown files...');

        // Standalone error pages emit e.g. 404.html, not 404/index.html
        const SKIP_PAGES = new Set(['404', '500']);

        for (const page of pages) {
          const { pathname } = page;

          if (SKIP_PAGES.has(pathname.replace(/\/$/, ''))) continue;

          try {
            // Construct path to HTML file
            const htmlPath = join(siteDir, pathname, 'index.html');
            const html = await readFile(htmlPath, 'utf-8');

            // Strip styles before JSDOM to avoid "Could not parse CSS stylesheet" warnings
            const cleanHtml = html
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<link[^>]*rel=["']stylesheet["'][^>]*\/?>/gi, '');

            // Parse HTML with jsdom
            const dom = new JSDOM(cleanHtml);
            const document = dom.window.document;

            // Check if page has llms content
            const contentElements = document.querySelectorAll('[data-llms-content]');

            if (contentElements.length === 0) {
              // No llms content, skip silently
              continue;
            }

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

            // Write markdown file as sibling to the directory
            // docs/framework/html/how-to/slug -> docs/framework/html/how-to/slug.md
            const mdPath = join(siteDir, `${pathname}.md`);
            const footer = generatePageFooter(pathname, framework, siteUrl);
            await mkdir(dirname(mdPath), { recursive: true });
            await writeFile(mdPath, markdown + footer, 'utf-8');

            // Track for llms.txt index (with leading slash for URLs)
            if (pathname.startsWith('docs/')) {
              docsPages.push({ pathname: `/${pathname}`, title, description, sort, framework });
            } else if (pathname.startsWith('blog/')) {
              blogPages.push({ pathname: `/${pathname}`, title, description, sort });
            } else {
              otherPages.push({ pathname: `/${pathname}`, title, description, sort });
            }
          } catch (error) {
            logger.error(`Failed to process ${pathname}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

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
        }

        // Write blog sub-index
        if (blogPages.length > 0) {
          const blogIndex = generateBlogIndex(blogPages, siteUrl);
          const blogIndexPath = join(siteDir, 'blog', 'llms.txt');
          await mkdir(dirname(blogIndexPath), { recursive: true });
          await writeFile(blogIndexPath, blogIndex, 'utf-8');
        }

        // Write root llms.txt index
        const rootIndex = generateRootIndex(frameworks, blogPages.length > 0, otherPages, siteUrl);
        const rootIndexPath = join(siteDir, 'llms.txt');
        await writeFile(rootIndexPath, rootIndex, 'utf-8');

        const subIndexCount = frameworks.length + (blogPages.length > 0 ? 1 : 0);
        logger.info(
          `Generated ${docsPages.length + blogPages.length + otherPages.length} markdown files, llms.txt root index, and ${subIndexCount} sub-indexes`
        );
      },
    },
  };
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
  }
  lines.push(`All documentation: ${siteUrl}/llms.txt`);
  return lines.join('\n');
}

/** Breadcrumb footer linking a sub-index back to root llms.txt. */
function generateIndexFooter(siteUrl: string): string {
  return `\n---\n\nAll documentation: ${siteUrl}/llms.txt\n`;
}

function generateRootIndex(frameworks: string[], hasBlog: boolean, otherPages: PageEntry[], siteUrl: string): string {
  let content = `# Video.js v10\n\n`;
  content += `> Modern video player framework with multi-platform support\n\n`;

  content += `## Documentation\n\n`;
  for (const fw of [...frameworks].sort()) {
    content += `- [${capitalize(fw)} Docs](${siteUrl}/docs/framework/${fw}/llms.txt)\n`;
  }
  content += `\n`;

  if (hasBlog) {
    content += `## Blog\n\n`;
    content += `- [Blog Posts](${siteUrl}/blog/llms.txt)\n\n`;
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

  // Build slug → page lookup
  const prefix = `/docs/framework/${framework}/`;
  const pageBySlug = new Map<string, PageEntry>();
  for (const page of pages) {
    if (page.pathname.startsWith(prefix)) {
      const slug = page.pathname.slice(prefix.length).replace(/\/$/, '');
      pageBySlug.set(slug, page);
    }
  }

  // Get sidebar filtered for this framework (production only)
  if (!isValidFramework(framework)) return content;
  const filtered = filterSidebarForLlms(sidebar, framework);

  content += renderSidebarToMarkdown(filtered, pageBySlug, siteUrl);
  content += generateIndexFooter(siteUrl);

  return content;
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
    } else {
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
 * Inline sidebar filter for the integration context where `@/` path aliases
 * aren't available (can't import `filterSidebar` from `src/utils/docs/sidebar`).
 * Filters out `devOnly` items and sections restricted to other frameworks,
 * then removes empty sections.
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
  let content = `# Video.js v10 — Blog\n\n`;
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
