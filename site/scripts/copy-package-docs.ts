/** Package site-generated markdown for @videojs/html, @videojs/react, or @videojs/cli. */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const siteDirectory = resolve(dirname(scriptPath), '..');
const workspaceRoot = resolve(siteDirectory, '..');

const PACKAGE_NAMES = {
  html: '@videojs/html',
  react: '@videojs/react',
} as const;

export type Framework = keyof typeof PACKAGE_NAMES;
export type PackageDocsTarget = Framework | 'cli';

export interface PackageDocumentationOptions {
  target: PackageDocsTarget;
  siteDist?: string;
  packagesDirectory?: string;
  version?: string;
}

const DOCS_SITE_BASE = 'https://videojs.org';

function isPackageDocsTarget(value: string): value is PackageDocsTarget {
  return value === 'cli' || value in PACKAGE_NAMES;
}

export function stripFooter(content: string): string {
  return content.replace(/\n+---\n\n(\w+ documentation: https:\/\/.*\n)?All documentation: https:\/\/.*\n*$/, '');
}

export function rewriteLinks(content: string, sourceSlug: string, framework: Framework): string {
  const frameworkPath = `/docs/framework/${framework}/`;
  const pattern = new RegExp(
    `(\\]\\()(?:https?://[^\\s)]+)?${escapeForRegex(frameworkPath)}([^\\s)#]*?)(\\.md|\\.txt|/)?(?=[)#])`,
    'g'
  );
  const sourceDir = posix.dirname(sourceSlug);

  return content.replace(pattern, (match, prefix: string, slug: string, extension: string | undefined) => {
    if (!slug) return match;
    return prefix + toRelativePath(sourceDir, `${slug}${extension === '.txt' ? '.txt' : '.md'}`);
  });
}

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
    "Start at [`./llms.txt`](./llms.txt) — it's the structured index of every page in this directory.",
    '',
    `Canonical online version: ${DOCS_SITE_BASE}/docs/framework/${framework}`,
    '',
  ].join('\n');
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toRelativePath(sourceDir: string, targetFile: string): string {
  const relativePath = posix.relative(sourceDir === '.' || sourceDir === '' ? '.' : sourceDir, targetFile);
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function walkDocumentation(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return walkDocumentation(path);
      return entry.isFile() && /\.(md|txt)$/.test(entry.name) ? [path] : [];
    })
    .sort();
}

function sourceSlug(relativePath: string): string {
  return relativePath.replace(/\.(md|txt)$/, '');
}

function replaceDirectory(targetDirectory: string, build: (stagingDirectory: string) => void): void {
  const parentDirectory = dirname(targetDirectory);
  mkdirSync(parentDirectory, { recursive: true });
  const stagingDirectory = mkdtempSync(join(parentDirectory, `.${basename(targetDirectory)}-`));

  try {
    build(stagingDirectory);
    rmSync(targetDirectory, { recursive: true, force: true });
    renameSync(stagingDirectory, targetDirectory);
  } finally {
    rmSync(stagingDirectory, { recursive: true, force: true });
  }
}

function copyFrameworkDocumentation({
  sourceDirectory,
  targetDirectory,
  framework,
  rewriteLocalLinks,
}: {
  sourceDirectory: string;
  targetDirectory: string;
  framework: Framework;
  rewriteLocalLinks: boolean;
}): number {
  const files = walkDocumentation(sourceDirectory);

  for (const sourcePath of files) {
    const relativePath = posix.relative(sourceDirectory.split(/[\\/]/).join('/'), sourcePath.split(/[\\/]/).join('/'));
    const raw = readFileSync(sourcePath, 'utf-8');
    const withoutFooter = stripFooter(raw);
    const transformed = rewriteLocalLinks
      ? rewriteLinks(withoutFooter, sourceSlug(relativePath), framework)
      : withoutFooter;
    const destinationPath = join(targetDirectory, relativePath);
    mkdirSync(dirname(destinationPath), { recursive: true });
    writeFileSync(destinationPath, transformed, 'utf-8');
  }

  return files.length;
}

export function packageDocumentation({
  target,
  siteDist = resolve(siteDirectory, 'dist'),
  packagesDirectory = resolve(workspaceRoot, 'packages'),
  version,
}: PackageDocumentationOptions): number {
  const frameworks: Framework[] = target === 'cli' ? ['html', 'react'] : [target];
  const sources = new Map(
    frameworks.map((framework) => [framework, join(siteDist, 'docs', 'framework', framework)] as const)
  );

  for (const sourceDirectory of sources.values()) {
    if (!existsSync(sourceDirectory)) {
      throw new Error(`${sourceDirectory} not found — run \`pnpm build:site\` first.`);
    }
  }

  const targetDirectory = join(packagesDirectory, target, 'docs');
  let copiedFiles = 0;

  replaceDirectory(targetDirectory, (stagingDirectory) => {
    for (const framework of frameworks) {
      const frameworkTarget = target === 'cli' ? join(stagingDirectory, framework) : stagingDirectory;
      const sourceDirectory = sources.get(framework);
      if (!sourceDirectory) throw new Error(`Missing documentation source for ${framework}`);
      copiedFiles += copyFrameworkDocumentation({
        sourceDirectory,
        targetDirectory: frameworkTarget,
        framework,
        rewriteLocalLinks: target !== 'cli',
      });
    }

    if (target !== 'cli') {
      writeFileSync(join(stagingDirectory, 'README.md'), synthesizeReadme({ framework: target, version }), 'utf-8');
    }
  });

  return copiedFiles;
}

function main(): void {
  const target = process.argv[2];
  if (!target || !isPackageDocsTarget(target)) {
    console.error('Usage: node --import tsx copy-package-docs.ts <html|react|cli>');
    process.exit(1);
  }

  try {
    const copiedFiles = packageDocumentation({ target, version: process.env.npm_package_version });
    console.log(`✓ Copied ${copiedFiles} doc files to packages/${target}/docs/`);
  } catch (error) {
    console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

const isEntrypoint = process.argv[1] && resolve(process.argv[1]) === resolve(scriptPath);
if (isEntrypoint) main();
