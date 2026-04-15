import { readdir, readFile } from 'node:fs/promises';
import { join, parse, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { JSDOM } from 'jsdom';

import { MAX_OG_TITLE_CHAR_LIMIT } from '../src/utils/og/title-config';

const BLOG_CONTENT_DIR = fileURLToPath(new URL('../src/content/blog', import.meta.url));
const DOCS_CONTENT_DIR = fileURLToPath(new URL('../src/content/docs', import.meta.url));

interface OgTitleAuditEntry {
  pathname: string;
  title: string;
  source: 'ogTitle' | 'pageTitle';
}

function getOgTitleLength(title: string): number {
  return title.toUpperCase().length;
}

async function listMdxFiles(dir: string): Promise<string[]> {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map(async (dirent) => {
      const fullPath = join(dir, dirent.name);
      if (dirent.isDirectory()) {
        return listMdxFiles(fullPath);
      }
      return dirent.name.endsWith('.mdx') ? [fullPath] : [];
    })
  );

  return files.flat();
}

async function buildBlogSlugMap(): Promise<Map<string, string>> {
  const mdxFiles = await listMdxFiles(BLOG_CONTENT_DIR);
  const slugMap = new Map<string, string>();

  for (const filePath of mdxFiles) {
    const relPath = relative(BLOG_CONTENT_DIR, filePath).replace(/\\/g, '/');
    const parsedPath = parse(relPath);
    const slug = parsedPath.base.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.mdx$/, '');
    const fullSlug = parsedPath.dir ? `${parsedPath.dir}/${slug}` : slug;
    slugMap.set(fullSlug, filePath);
  }

  return slugMap;
}

function getDocsSourcePath(pathname: string): string | null {
  if (!pathname.startsWith('docs/framework/')) {
    return null;
  }

  const segments = pathname.split('/');
  const docId = segments.slice(3).join('/');

  return docId ? join(DOCS_CONTENT_DIR, `${docId}.mdx`) : null;
}

async function readH1Text(htmlPath: string): Promise<string | null> {
  const html = await readFile(htmlPath, 'utf-8');
  const cleanHtml = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<link[^>]*rel=["']stylesheet["'][^>]*\/?>/gi, '');
  const dom = new JSDOM(cleanHtml);
  return dom.window.document.querySelector('h1')?.textContent?.trim() ?? null;
}

function extractOgTitle(frontmatter: string): string | null {
  const match = frontmatter.match(/^\s*ogTitle:\s*(.+)\s*$/m);

  if (!match) {
    return null;
  }

  const rawValue = match[1].trim().replace(/\s+#.*$/, '');

  if ((rawValue.startsWith("'") && rawValue.endsWith("'")) || (rawValue.startsWith('"') && rawValue.endsWith('"'))) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

async function readFrontmatterOgTitle(filePath: string | null): Promise<string | null> {
  if (!filePath) {
    return null;
  }

  const contents = await readFile(filePath, 'utf-8');
  const frontmatterMatch = contents.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return null;
  }

  return extractOgTitle(frontmatterMatch[1]);
}

async function resolveAuditEntry(
  pathname: string,
  htmlPath: string,
  blogSlugMap: Map<string, string>
): Promise<OgTitleAuditEntry | null> {
  if (pathname.startsWith('blog/authors/')) {
    return null;
  }

  let sourceFilePath: string | null = null;

  if (pathname.startsWith('blog/')) {
    sourceFilePath = blogSlugMap.get(pathname.slice('blog/'.length)) ?? null;
  } else if (pathname.startsWith('docs/framework/')) {
    sourceFilePath = getDocsSourcePath(pathname);
  } else {
    return null;
  }

  const ogTitle = await readFrontmatterOgTitle(sourceFilePath);

  if (ogTitle) {
    return {
      pathname,
      title: ogTitle,
      source: 'ogTitle',
    };
  }

  const pageTitle = await readH1Text(htmlPath);

  if (!pageTitle) {
    return null;
  }

  return {
    pathname,
    title: pageTitle,
    source: 'pageTitle',
  };
}

export default function ogTitleAudit(): AstroIntegration {
  return {
    name: 'og-title-audit',
    hooks: {
      'astro:build:done': async ({ dir, pages, logger }) => {
        const siteDir = fileURLToPath(dir);
        const blogSlugMap = await buildBlogSlugMap();
        const offenders: OgTitleAuditEntry[] = [];

        for (const page of pages) {
          const pathname = page.pathname.replace(/\/$/, '');

          if (!pathname.startsWith('blog/') && !pathname.startsWith('docs/framework/')) {
            continue;
          }

          const htmlPath = join(siteDir, pathname, 'index.html');
          const auditEntry = await resolveAuditEntry(pathname, htmlPath, blogSlugMap);

          if (!auditEntry) {
            continue;
          }

          if (getOgTitleLength(auditEntry.title) > MAX_OG_TITLE_CHAR_LIMIT) {
            offenders.push(auditEntry);
          }
        }

        offenders.sort((a, b) => a.pathname.localeCompare(b.pathname));

        if (offenders.length === 0) {
          logger.info(`All docs/blog OG titles are within the ${MAX_OG_TITLE_CHAR_LIMIT}-character limit.`);
          return;
        }

        logger.warn(
          `Found ${offenders.length} docs/blog OG titles over the ${MAX_OG_TITLE_CHAR_LIMIT}-character limit. Consider adding shorter ogTitle values:`
        );

        for (const offender of offenders) {
          logger.warn(
            `- /${offender.pathname} (${getOgTitleLength(offender.title)} chars, source: ${offender.source}): ${offender.title}`
          );
        }
      },
    },
  };
}
