/** Package site-generated markdown for @videojs/html or @videojs/react. */
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

import { VJS10_VERSION } from '../src/consts';
import { renderInstallationMarkdownSelection } from '../src/utils/installation/markdown';
import {
  getInstallationRoutePath,
  INSTALLATION_ROUTES,
  INSTALLATION_ROUTE_SEGMENTS,
} from '../src/utils/installation/routes';

const scriptPath = fileURLToPath(import.meta.url);
const siteDirectory = resolve(dirname(scriptPath), '..');
const workspaceRoot = resolve(siteDirectory, '..');

const PACKAGE_NAMES = {
  html: '@videojs/html',
  react: '@videojs/react',
} as const;

export type Framework = keyof typeof PACKAGE_NAMES;
export type PackageDocsTarget = Framework;

export interface PackageDocumentationOptions {
  target: PackageDocsTarget;
  siteDist?: string;
  packagesDirectory?: string;
  version?: string;
}

const DOCS_SITE_BASE = 'https://videojs.org';

function installationDocuments(framework: Framework): ReadonlyArray<readonly [source: string, destination: string]> {
  return INSTALLATION_ROUTE_SEGMENTS.filter((route) =>
    INSTALLATION_ROUTES[route].frameworks.some((candidate) => candidate === framework)
  ).map((route) => [`${getInstallationRoutePath(route).slice(1)}.md`, `${INSTALLATION_ROUTES[route].slug}.md`]);
}

const INSTALLATION_DOCUMENTS = {
  html: installationDocuments('html'),
  react: installationDocuments('react'),
} satisfies Record<Framework, readonly (readonly [source: string, destination: string])[]>;

function isPackageDocsTarget(value: string): value is PackageDocsTarget {
  return value in PACKAGE_NAMES;
}

export function stripFooter(content: string): string {
  return content.replace(/\n+---\n\n(?:\w+ documentation: https:\/\/.*\n)*All documentation: https:\/\/.*\n*$/, '');
}

/** Package-local instructions should resolve the renderer bundled with the installed player, not the registry tag. */
export function useInstalledAgentCommands(content: string): string {
  return content.replace(/(@videojs\/(?:html|react))@latest(?= agents init)/g, '$1');
}

export function rewriteLinks(content: string, sourceSlug: string, framework: Framework): string {
  const sourceDir = posix.dirname(sourceSlug);
  let rewritten = content;

  for (const [source, destination] of INSTALLATION_DOCUMENTS[framework]) {
    const publicPath = `/${source.replace(/\.md$/, '')}`;
    // Shadcn links pick a framework branch with `?framework=`; the bundled copy holds only this package's branch.
    const canonicalPattern = new RegExp(
      `(\\]\\()(?:https?://[^\\s)]+)?${escapeForRegex(publicPath)}(?:\\.md|/)?(?:\\?framework=(\\w+))?(?=[)#])`,
      'g'
    );

    rewritten = rewritten.replace(canonicalPattern, (match, prefix: string, linkFramework: string | undefined) =>
      linkFramework && linkFramework !== framework ? match : prefix + toRelativePath(sourceDir, destination)
    );
  }

  const frameworkPath = `/docs/framework/${framework}/`;
  const pattern = new RegExp(
    `(\\]\\()(?:https?://[^\\s)]+)?${escapeForRegex(frameworkPath)}([^\\s)#]*?)(\\.md|\\.txt|/)?(?=[)#])`,
    'g'
  );

  return rewritten.replace(pattern, (match, prefix: string, slug: string, extension: string | undefined) => {
    if (!slug) return match;

    return prefix + toRelativePath(sourceDir, `${slug}${extension === '.txt' ? '.txt' : '.md'}`);
  });
}

function copyInstallationDocumentation({
  siteDist,
  targetDirectory,
  framework,
  rewriteLocalLinks,
  version,
}: {
  siteDist: string;
  targetDirectory: string;
  framework: Framework;
  rewriteLocalLinks: boolean;
  version: string | undefined;
}): number {
  let copied = 0;

  for (const [source, destination] of INSTALLATION_DOCUMENTS[framework]) {
    const sourcePath = join(siteDist, source);
    if (!existsSync(sourcePath)) throw new Error(`Missing installation documentation source: ${sourcePath}`);

    const raw = useInstalledAgentCommands(stripFooter(readFileSync(sourcePath, 'utf-8')));
    const params = source.endsWith('/shadcn.md') ? new URLSearchParams({ framework }) : new URLSearchParams();
    const rendered = renderInstallationMarkdownSelection(
      raw,
      `/${source.replace(/\.md$/, '')}`,
      params,
      version ?? VJS10_VERSION
    );

    if (!rendered || rendered.status !== 200) {
      throw new Error(`Could not render ${source} for ${framework}: ${rendered?.body.trim() ?? 'unknown route'}`);
    }

    const transformed = rewriteLocalLinks
      ? rewriteLinks(rendered.body, sourceSlug(destination), framework)
      : rendered.body;
    const destinationPath = join(targetDirectory, destination);

    mkdirSync(dirname(destinationPath), { recursive: true });
    writeFileSync(destinationPath, transformed, 'utf-8');
    copied += 1;
  }

  return copied;
}

/**
 * The web indexes introduce themselves in terms of `.md` URLs and point at complete files that a package does not
 * bundle. Inside a package they are files on disk, so restate the header for that setting: which package and version
 * the copy belongs to and that links are relative paths.
 */
export function rewriteIndexHeader(
  content: string,
  { framework, version }: { framework: Framework; version: string | undefined }
): string {
  const packageName = PACKAGE_NAMES[framework];
  const versionSuffix = version ? ` v${version}` : '';
  const context = `Bundled with \`${packageName}\`${versionSuffix}. Links are relative paths to files in this directory.`;

  return (
    content
      // The first blockquote line is the header. A section index opens with the section's own description, which stays.
      .replace(/^> .*$/m, (line) => {
        const description = line
          .slice(2)
          .split(/ ?Every page below/)[0]
          ?.trim();

        return `> ${description ? `${description} ` : ''}${context}`;
      })
      // The framework index also quotes each section's complete file beside its section index.
      .replace(/ This section in one file \([^)]*\): \S+/g, '')
  );
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
  version,
}: {
  sourceDirectory: string;
  targetDirectory: string;
  framework: Framework;
  rewriteLocalLinks: boolean;
  version: string | undefined;
}): number {
  // A complete file concatenates the pages bundled beside it, so a package ships the pages and indexes only.
  const files = walkDocumentation(sourceDirectory).filter((sourcePath) => basename(sourcePath) !== 'llms-full.txt');

  for (const sourcePath of files) {
    const relativePath = posix.relative(sourceDirectory.split(/[\\/]/).join('/'), sourcePath.split(/[\\/]/).join('/'));
    const raw = readFileSync(sourcePath, 'utf-8');
    const withoutFooter = useInstalledAgentCommands(stripFooter(raw));
    const isIndex = basename(relativePath) === 'llms.txt';
    const transformed = rewriteLocalLinks
      ? rewriteLinks(
          isIndex ? rewriteIndexHeader(withoutFooter, { framework, version }) : withoutFooter,
          sourceSlug(relativePath),
          framework
        )
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
  const frameworks: Framework[] = [target];
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
      const frameworkTarget = stagingDirectory;
      const sourceDirectory = sources.get(framework);
      if (!sourceDirectory) throw new Error(`Missing documentation source for ${framework}`);

      copiedFiles += copyFrameworkDocumentation({
        sourceDirectory,
        targetDirectory: frameworkTarget,
        framework,
        rewriteLocalLinks: true,
        version,
      });
      copiedFiles += copyInstallationDocumentation({
        siteDist,
        targetDirectory: frameworkTarget,
        framework,
        rewriteLocalLinks: true,
        version,
      });
    }

    writeFileSync(join(stagingDirectory, 'README.md'), synthesizeReadme({ framework: target, version }), 'utf-8');
  });

  return copiedFiles;
}

function main(): void {
  const target = process.argv[2];

  if (!target || !isPackageDocsTarget(target)) {
    console.error('Usage: node --import tsx copy-package-docs.ts <html|react>');
    process.exit(1);
  }

  // Preview releases (pkg.pr.new) pack straight from source, and building the
  // site just to bundle docs into a throwaway tarball is not worth the CI time.
  if (process.env.VIDEOJS_SKIP_PACKAGE_DOCS) {
    console.log(`• Skipped packages/${target}/docs/ (VIDEOJS_SKIP_PACKAGE_DOCS is set)`);
    return;
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
