/**
 * Copies the per-framework markdown documentation subtree emitted by the site
 * build into a target package's `docs/` directory, ready to be shipped in the
 * package tarball.
 *
 * Invoked from each package's `prepack` lifecycle script:
 *   "prepack": "node --import tsx ../../site/scripts/copy-package-docs.ts html"
 *
 * Reads `site/dist/docs/framework/<framework>/` (produced by the llms-markdown
 * integration), rewrites absolute site URLs to local relative paths, strips
 * the breadcrumb footer from each .md file, synthesizes a short cold-start
 * `docs/README.md`, and writes the result to `packages/<framework>/docs/`.
 *
 * Hard-errors if `site/dist` is missing — run `pnpm build:site` first.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SITE_DIR = resolve(__dirname, '..');
const WORKSPACE_ROOT = resolve(SITE_DIR, '..');

const PACKAGE_NAMES = {
  html: '@videojs/html',
  react: '@videojs/react',
} as const;

export type Framework = keyof typeof PACKAGE_NAMES;

const DOCS_SITE_BASE = 'https://videojs.org';

function isFramework(value: string): value is Framework {
  return value in PACKAGE_NAMES;
}

// ──────────────────────────────────────────────────────────────────────────
// Pure transforms (exported for unit tests)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Removes the trailing breadcrumb block the site appends to every .md page
 * and to llms.txt (looks like `---\n\n<framework> documentation: ...`).
 * Mirrors the regex the CLI uses in `packages/cli/src/utils/docs.ts`.
 */
export function stripFooter(content: string): string {
  return content.replace(/\n+---\n\n(\w+ documentation: https:\/\/.*\n)?All documentation: https:\/\/.*\n*$/, '');
}

/**
 * Rewrites URLs that point at this framework's docs subtree into paths
 * relative to the source file's location, so an agent reading from
 * node_modules can follow links locally instead of via WebFetch.
 *
 * - sourceSlug is the path of the file the content belongs to, relative to
 *   the framework root and without an extension: e.g. `concepts/overview`
 *   for `concepts/overview.md`, or `llms` for the index `llms.txt`.
 * - URLs outside the framework's docs subtree (e.g. the root /llms.txt,
 *   blog posts, the other framework) are left untouched.
 */
export function rewriteLinks(content: string, sourceSlug: string, framework: Framework): string {
  const frameworkPath = `/docs/framework/${framework}/`;
  // Match URLs in markdown link target position only: `](URL)`. Anchoring to
  // `](` keeps the regex from chewing through URL-shaped strings inside link
  // text (e.g. inside code spans like `[\`videojs.org/.../llms.txt\`](...)`)
  // where the surrounding characters aren't safe to overrun.
  //
  // Capture the trailing extension (`.md`, `.txt`, or `/`) so it can be
  // preserved — links to the framework's `llms.txt` must stay `.txt`, not be
  // rewritten to `.md`. URLs with no extension and trailing-slash URLs both
  // map to the `.md` file the site emits for that slug.
  const pattern = new RegExp(
    `(\\]\\()(?:https?://[^\\s)]+)?${escapeForRegex(frameworkPath)}([^\\s)#]*?)(\\.md|\\.txt|/)?(?=[)#])`,
    'g'
  );
  const sourceDir = posix.dirname(sourceSlug);
  return content.replace(pattern, (match, prefix: string, slug: string, ext: string | undefined) => {
    // Bare framework-root URLs (empty slug) don't map to a single file —
    // leave them alone rather than synthesizing a nonsense `./.md`.
    if (!slug) return match;
    const targetExt = ext === '.txt' ? '.txt' : '.md';
    return prefix + toRelativePath(sourceDir, `${slug}${targetExt}`);
  });
}

/**
 * Body for the synthesized `docs/README.md` cold-start file. Short on purpose:
 * agents reflexively read README, this gets them to the structured index.
 */
export function synthesizeReadme({
  framework,
  version,
}: {
  framework: Framework;
  version: string | undefined;
}): string {
  const packageName = PACKAGE_NAMES[framework];
  if (!packageName) throw new Error(`Unknown framework: ${framework}`);
  const versionSuffix = version ? ` v${version}` : '';
  return [
    `# ${packageName} documentation`,
    '',
    `Bundled markdown documentation for \`${packageName}\`${versionSuffix}.`,
    '',
    `Start at [\`./llms.txt\`](./llms.txt) — it's the structured index of every page in this directory.`,
    '',
    `Canonical online version: ${DOCS_SITE_BASE}/docs/framework/${framework}`,
    '',
  ].join('\n');
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toRelativePath(sourceDir: string, targetFile: string): string {
  const fromDir = sourceDir === '.' || sourceDir === '' ? '.' : sourceDir;
  const rel = posix.relative(fromDir, targetFile);
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function isDocFile(path: string): boolean {
  return path.endsWith('.md') || path.endsWith('.txt');
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile() && isDocFile(full)) {
      out.push(full);
    }
  }
  return out;
}

function slugFor(relPath: string): string {
  // 'concepts/overview.md' -> 'concepts/overview'
  // 'llms.txt' -> 'llms'
  return relPath.replace(/\.(md|txt)$/, '');
}

// ──────────────────────────────────────────────────────────────────────────
// Main IO
// ──────────────────────────────────────────────────────────────────────────

function main(): void {
  const framework = process.argv[2];
  if (!framework || !isFramework(framework)) {
    console.error(`Usage: node --import tsx copy-package-docs.ts <html|react>`);
    process.exit(1);
  }

  const sourceDir = join(SITE_DIR, 'dist', 'docs', 'framework', framework);
  if (!existsSync(sourceDir)) {
    console.error(`✗ ${sourceDir} not found — run \`pnpm build:site\` first.`);
    process.exit(1);
  }

  const targetDir = join(WORKSPACE_ROOT, 'packages', framework, 'docs');
  const version = process.env.npm_package_version;

  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });

  const files = walk(sourceDir);
  for (const sourcePath of files) {
    const relPath = posix.relative(sourceDir.split(/[\\/]/).join('/'), sourcePath.split(/[\\/]/).join('/'));
    const slug = slugFor(relPath);
    const raw = readFileSync(sourcePath, 'utf-8');
    const transformed = rewriteLinks(stripFooter(raw), slug, framework);
    const destPath = join(targetDir, relPath);
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, transformed, 'utf-8');
  }

  writeFileSync(join(targetDir, 'README.md'), synthesizeReadme({ framework, version }), 'utf-8');

  console.log(`✓ Copied ${files.length} doc files to packages/${framework}/docs/`);
}

const isEntrypoint = process.argv[1] && resolve(process.argv[1]) === resolve(__filename);
if (isEntrypoint) {
  main();
}
