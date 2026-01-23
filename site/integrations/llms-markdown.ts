import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

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
        const docsPages: Array<{ pathname: string; title: string; description?: string; sort?: string }> = [];
        const blogPages: Array<{ pathname: string; title: string; description?: string; sort?: string }> = [];
        const otherPages: Array<{ pathname: string; title: string; description?: string; sort?: string }> = [];

        logger.info('Generating LLM-optimized markdown files...');

        for (const page of pages) {
          const { pathname } = page;

          try {
            // Construct path to HTML file
            const htmlPath = join(siteDir, pathname, 'index.html');
            const html = await readFile(htmlPath, 'utf-8');

            // Parse HTML with jsdom
            const dom = new JSDOM(html);
            const document = dom.window.document;

            // Check if page has llms content
            const contentElements = document.querySelectorAll('[data-llms-content]');

            if (contentElements.length === 0) {
              // No llms content, skip silently
              continue;
            }

            // For each content element, remove [data-llms-ignore] descendants
            const contentParts: string[] = [];
            contentElements.forEach((contentEl) => {
              const clone = contentEl.cloneNode(true) as Element;
              const ignoreElements = clone.querySelectorAll('[data-llms-ignore]');
              ignoreElements.forEach((el) => el.remove());
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

            // Write markdown file as sibling to the directory
            // docs/framework/html/style/css/slug -> docs/framework/html/style/css/slug.md
            const mdPath = join(siteDir, `${pathname}.md`);
            await mkdir(dirname(mdPath), { recursive: true });
            await writeFile(mdPath, markdown, 'utf-8');

            // Track for llms.txt index (with leading slash for URLs)
            if (pathname.startsWith('docs/')) {
              docsPages.push({ pathname: `/${pathname}`, title, description, sort });
            } else if (pathname.startsWith('blog/')) {
              blogPages.push({ pathname: `/${pathname}`, title, description, sort });
            } else {
              otherPages.push({ pathname: `/${pathname}`, title, description, sort });
            }
          } catch (error) {
            logger.error(`Failed to process ${pathname}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // Generate llms.txt index file
        const llmsTxt = generateLlmsTxt(docsPages, blogPages, otherPages);
        const llmsTxtPath = join(siteDir, 'llms.txt');
        await writeFile(llmsTxtPath, llmsTxt, 'utf-8');

        logger.info(
          `Generated ${docsPages.length + blogPages.length + otherPages.length} markdown files and llms.txt index`
        );
      },
    },
  };
}

function generateLlmsTxt(
  docsPages: Array<{ pathname: string; title: string; description?: string; sort?: string }>,
  blogPages: Array<{ pathname: string; title: string; description?: string; sort?: string }>,
  otherPages: Array<{ pathname: string; title: string; description?: string; sort?: string }>
): string {
  // Group docs by framework and style
  const docsByFrameworkStyle = new Map<
    string,
    Array<{ pathname: string; title: string; description?: string; sort?: string }>
  >();

  for (const doc of docsPages) {
    // Extract framework and style from pathname
    // Pattern: /docs/framework/{framework}/style/{style}/{...slug}
    const match = doc.pathname.match(/^\/docs\/framework\/([^/]+)\/style\/([^/]+)\//);
    if (match) {
      const [, framework, style] = match;
      const key = `${framework}/${style}`;
      if (!docsByFrameworkStyle.has(key)) {
        docsByFrameworkStyle.set(key, []);
      }
      docsByFrameworkStyle.get(key)!.push(doc);
    }
  }

  // Build llms.txt content
  let content = `# Video.js v10\n\n`;
  content += `> Modern video player framework with multi-platform support\n\n`;

  // Add documentation sections grouped by framework/style
  if (docsByFrameworkStyle.size > 0) {
    content += `## Documentation\n\n`;

    // Sort by framework/style for consistent output
    const sortedKeys = Array.from(docsByFrameworkStyle.keys()).sort();

    for (const key of sortedKeys) {
      const [framework, style] = key.split('/');
      const frameworkLabel = framework.charAt(0).toUpperCase() + framework.slice(1);
      const styleLabel = style.toUpperCase();

      content += `### ${frameworkLabel} + ${styleLabel}\n\n`;

      const docs = docsByFrameworkStyle.get(key)!;
      // Sort docs by pathname for consistent output
      docs.sort((a, b) => a.pathname.localeCompare(b.pathname));

      for (const doc of docs) {
        if (doc.description) {
          content += `- [${doc.title}](${doc.pathname}): ${doc.description}\n`;
        } else {
          content += `- [${doc.title}](${doc.pathname})\n`;
        }
      }
      content += `\n`;
    }
  }

  // Add blog posts section
  if (blogPages.length > 0) {
    content += `## Blog Posts\n\n`;

    // Sort by date using data-llms-sort attribute in reverse order (newest first)
    const sortedBlogPages = [...blogPages].sort((a, b) => {
      // If both have sort attributes, compare them (reverse for newest first)
      if (a.sort && b.sort) {
        return b.sort.localeCompare(a.sort);
      }
      // Fallback to pathname comparison if sort is missing
      return b.pathname.localeCompare(a.pathname);
    });

    for (const post of sortedBlogPages) {
      if (post.description) {
        content += `- [${post.title}](${post.pathname}): ${post.description}\n`;
      } else {
        content += `- [${post.title}](${post.pathname})\n`;
      }
    }
    content += `\n`;
  }

  // Add other pages section
  if (otherPages.length > 0) {
    content += `## Other\n\n`;

    // Sort by pathname
    const sortedOtherPages = [...otherPages].sort((a, b) => a.pathname.localeCompare(b.pathname));

    for (const page of sortedOtherPages) {
      if (page.description) {
        content += `- [${page.title}](${page.pathname}): ${page.description}\n`;
      } else {
        content += `- [${page.title}](${page.pathname})\n`;
      }
    }
    content += `\n`;
  }

  return content;
}
