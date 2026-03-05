import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

interface PageEntry {
  pathname: string;
  title: string;
  description?: string;
  sort?: string;
  framework?: string;
}

export default function llmsMarkdown(): AstroIntegration {
  return {
    name: 'llms-markdown',
    hooks: {
      'astro:build:done': async ({ dir, pages, logger }) => {
        const siteDir = fileURLToPath(dir);
        const turndown = new TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
          emDelimiter: '*',
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
            await mkdir(dirname(mdPath), { recursive: true });
            await writeFile(mdPath, markdown, 'utf-8');

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
          const subIndex = generateDocsIndex(fw, fwPages);
          const subIndexPath = join(siteDir, 'docs', 'framework', fw, 'llms.txt');
          await mkdir(dirname(subIndexPath), { recursive: true });
          await writeFile(subIndexPath, subIndex, 'utf-8');
        }

        // Write blog sub-index
        if (blogPages.length > 0) {
          const blogIndex = generateBlogIndex(blogPages);
          const blogIndexPath = join(siteDir, 'blog', 'llms.txt');
          await mkdir(dirname(blogIndexPath), { recursive: true });
          await writeFile(blogIndexPath, blogIndex, 'utf-8');
        }

        // Write root llms.txt index
        const rootIndex = generateRootIndex(frameworks, blogPages.length > 0, otherPages);
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

function generateRootIndex(frameworks: string[], hasBlog: boolean, otherPages: PageEntry[]): string {
  let content = `# Video.js v10\n\n`;
  content += `> Modern video player framework with multi-platform support\n\n`;

  content += `## Documentation\n\n`;
  for (const fw of [...frameworks].sort()) {
    const label = fw.charAt(0).toUpperCase() + fw.slice(1);
    content += `- [${label} Docs](/docs/framework/${fw}/llms.txt)\n`;
  }
  content += `\n`;

  if (hasBlog) {
    content += `## Blog\n\n`;
    content += `- [Blog Posts](/blog/llms.txt)\n\n`;
  }

  if (otherPages.length > 0) {
    content += `## Other\n\n`;
    const sorted = [...otherPages].sort((a, b) => a.pathname.localeCompare(b.pathname));
    for (const page of sorted) {
      if (page.description) {
        content += `- [${page.title}](${page.pathname}.md): ${page.description}\n`;
      } else {
        content += `- [${page.title}](${page.pathname}.md)\n`;
      }
    }
    content += `\n`;
  }

  return content;
}

function generateDocsIndex(framework: string, pages: PageEntry[]): string {
  const label = framework.charAt(0).toUpperCase() + framework.slice(1);
  let content = `# Video.js v10 — ${label} Documentation\n\n`;

  const sorted = [...pages].sort((a, b) => a.pathname.localeCompare(b.pathname));
  for (const page of sorted) {
    if (page.description) {
      content += `- [${page.title}](${page.pathname}.md): ${page.description}\n`;
    } else {
      content += `- [${page.title}](${page.pathname}.md)\n`;
    }
  }
  content += `\n`;

  return content;
}

function generateBlogIndex(pages: PageEntry[]): string {
  let content = `# Video.js v10 — Blog\n\n`;

  // Newest first
  const sorted = [...pages].sort((a, b) => {
    if (a.sort && b.sort) {
      return b.sort.localeCompare(a.sort);
    }
    return b.pathname.localeCompare(a.pathname);
  });

  for (const post of sorted) {
    if (post.description) {
      content += `- [${post.title}](${post.pathname}.md): ${post.description}\n`;
    } else {
      content += `- [${post.title}](${post.pathname}.md)\n`;
    }
  }
  content += `\n`;

  return content;
}
