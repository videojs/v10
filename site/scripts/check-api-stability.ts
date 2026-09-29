/**
 * Enforce the public API stability rule: an export a published package exposes is stable only when a reference page
 * documents it. Every other export must say so in its JSDoc: `@internal` by default, `@experimental` when it is
 * documented on a page marked `stability: unstable`, or `@deprecated`.
 *
 * The public surface is read from the built declarations each package's `exports` map points at, so run `pnpm
 * build:packages` first. Tags are read from (and `--fix` writes to) the matching `src/` declaration.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const scriptPath = fileURLToPath(import.meta.url);
const monorepoRoot = resolve(scriptPath, '..', '..', '..');

/** Tags that satisfy each required stability. */
const ACCEPTED_TAGS = {
  experimental: ['experimental', 'deprecated'],
  internal: ['internal', 'experimental', 'deprecated'],
} as const;

/** Suffixes of companion exports a page documents alongside its subject (prop/state tables, element classes, …). */
const COMPANION_SUFFIXES = ['Props', 'State', 'Element', 'Options', 'Result', 'Config'];

/** `@videojs/cdn` repackages `@videojs/html` as script-tag bundles, so html owns those declarations. */
const EXCLUDED_PACKAGES = new Set(['@videojs/cdn']);

/**
 * Packages whose declarations this check leaves alone. SPF is documented for media authors by its own maintainers;
 * store's public surface is still being decided.
 */
const UNCHECKED_PACKAGE_DIRECTORIES = ['packages/spf/', 'packages/store/'];

/** Packages docs examples must not import from; their public parts are re-exported by `@videojs/html` and `/react`. */
const INTERNAL_PACKAGE_PATTERN = /^@videojs\/(?:core|media|utils|element|icons|skins)(?:\/|$)/;

const MEMBER_PATTERN = /\b([A-Z][\w$]*)((?:\.[A-Z][\w$]*)+)/g;
const SELECTOR_PATTERN = /\bselect[A-Z][\w$]*/g;
const FENCE_PATTERN = /^([ \t]*)(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^\1\2[ \t]*$/gm;
const INLINE_CODE_PATTERN = /`([^`\n]+)`/g;
const IMPORT_PATTERN =
  /import\s+(?:type\s+)?(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*(?:from\s+)?['"](@videojs\/[^'"]+)['"]|import\(\s*['"](@videojs\/[^'"]+)['"]\s*\)/g;
const SUBJECT_ATTRIBUTE_PATTERN =
  /<(ComponentReference|UtilReference|MediaReference|ComponentImports|FeatureReference|FeatureImports|MediaImports|ModuleImports|ExtensionImports|SkinImports)\b([^>]*)>/g;

// ── Docs coverage ────────────────────────────────────────────────────────────

export interface Coverage {
  /** Names documented by stable reference pages. */
  stable: Set<string>;
  /** Names documented only by pages marked `stability: unstable`. */
  unstable: Set<string>;
  /** Module specifier patterns (`*` wildcard) whose default export a stable page documents. */
  stableModules: string[];
  unstableModules: string[];
}

export interface Frontmatter {
  title?: string;
  frameworkTitle: string[];
  stability?: string;
  apis: string[];
}

function walkFiles(directory: string, predicate: (path: string) => boolean): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walkFiles(path, predicate);

      return entry.isFile() && predicate(path) ? [path] : [];
    })
    .sort();
}

function pascalCase(kebab: string): string {
  return kebab
    .split('-')
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');
}

function unquote(value: string): string {
  return value.trim().replace(/^(['"])(.*)\1$/, '$2');
}

/** Read the frontmatter fields this check needs. Astro validates the full schema; this only extracts values. */
export function parseFrontmatter(source: string): Frontmatter {
  const block = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const frontmatter: Frontmatter = { frameworkTitle: [], apis: [] };
  let list: string[] | undefined;

  for (const line of block.split('\n')) {
    const item = line.match(/^\s+-\s+(.+)$/);
    const nested = line.match(/^\s+[\w-]+:\s*(.+)$/);
    const field = line.match(/^([\w-]+):\s*(.*)$/);

    if (item && list) {
      list.push(unquote(item[1]!));
    } else if (nested && list === frontmatter.frameworkTitle) {
      list.push(unquote(nested[1]!));
    } else if (field) {
      const [, key, value = ''] = field;

      list = undefined;

      if (key === 'title') frontmatter.title = unquote(value);

      if (key === 'stability') frontmatter.stability = unquote(value);

      if (key === 'frameworkTitle') list = frontmatter.frameworkTitle;

      if (key === 'apis') {
        list = frontmatter.apis;

        const inline = value.match(/^\[(.*)\]$/);

        if (inline) list.push(...inline[1]!.split(',').map(unquote).filter(Boolean));
      }
    }
  }

  return frontmatter;
}

/** Code a page shows readers: fenced blocks and inline code spans. */
function pageCode(body: string): string {
  const blocks: string[] = [];
  const prose = body.replace(FENCE_PATTERN, (_match, _indent, _fence, code: string) => {
    blocks.push(code);
    return '';
  });

  for (const [, code] of prose.matchAll(INLINE_CODE_PATTERN)) blocks.push(code!);

  return blocks.join('\n');
}

function subjectName(value: string): string {
  const name = value.startsWith('media-') ? pascalCase(value.slice('media-'.length)) : value;

  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : pascalCase(name);
}

/** Collect what one reference page documents: its subjects, their parts, feature selectors, and declared `apis`. */
export function collectPageCoverage(source: string): { names: Set<string>; modules: string[]; unstable: boolean } {
  const frontmatter = parseFrontmatter(source);
  const body = source.replace(/^---\n[\s\S]*?\n---/, '');
  const code = pageCode(body);
  const subjects = new Set<string>();
  const modules: string[] = [];
  let isFeaturePage = false;

  for (const title of [frontmatter.title, ...frontmatter.frameworkTitle]) {
    if (title && /^[A-Za-z_$][\w$-]*$/.test(title)) subjects.add(subjectName(title));
  }

  for (const [, component, attributes] of body.matchAll(SUBJECT_ATTRIBUTE_PATTERN)) {
    for (const [, key, single, list] of attributes!.matchAll(/\b(\w+)=(?:"([^"]*)"|\{\[([^\]]*)\]\})/g)) {
      const values = single !== undefined ? [single] : [...list!.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]!);

      for (const value of values) {
        if (key === 'feature') {
          isFeaturePage = true;
          subjects.add(`${value}Feature`);
        } else if (['component', 'util', 'react'].includes(key!)) {
          subjects.add(value);
        } else if (key === 'media' || (key === 'html' && component === 'ComponentImports')) {
          subjects.add(pascalCase(value));
        }
      }
    }
  }

  const names = new Set(subjects);

  // `<Slider.Thumbnail.Root>` documents the parts React namespaces flatten to `SliderThumbnail*`, `SliderThumbnailRoot*`.
  for (const [, owner, members] of code.matchAll(MEMBER_PATTERN)) {
    if (!subjects.has(owner!)) continue;

    let name = owner!;

    for (const member of members!.slice(1).split('.')) names.add((name += member));
  }

  if (isFeaturePage) for (const [selector] of code.matchAll(SELECTOR_PATTERN)) names.add(selector);

  for (const api of frontmatter.apis) {
    if (api.startsWith('@')) modules.push(api);
    else names.add(api);
  }

  return { names, modules, unstable: frontmatter.stability === 'unstable' };
}

export function collectCoverage(siteDirectory: string): Coverage {
  const coverage: Coverage = { stable: new Set(), unstable: new Set(), stableModules: [], unstableModules: [] };

  for (const file of walkFiles(join(siteDirectory, 'src/content/docs/reference'), (path) => path.endsWith('.mdx'))) {
    const page = collectPageCoverage(readFileSync(file, 'utf8'));
    const names = page.unstable ? coverage.unstable : coverage.stable;

    for (const name of page.names) names.add(name);

    (page.unstable ? coverage.unstableModules : coverage.stableModules).push(...page.modules);
  }

  return coverage;
}

export function isCoveredName(name: string, covered: ReadonlySet<string>): boolean {
  const candidates = [name];

  for (const suffix of COMPANION_SUFFIXES) {
    if (name.length > suffix.length && name.endsWith(suffix)) candidates.push(name.slice(0, -suffix.length));
  }

  // `UseHotkeyOptions` belongs to `useHotkey`, and `QualityOptionsResult` to `useQualityOptions`.
  return candidates.some(
    (candidate) =>
      covered.has(candidate) ||
      covered.has(candidate[0]!.toLowerCase() + candidate.slice(1)) ||
      (candidate !== name && covered.has(`use${candidate}`))
  );
}

export function matchesModulePattern(specifier: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => {
    const source = pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));

    return new RegExp(`^${source.join('[^/]+')}$`).test(specifier);
  });
}

// ── Public surface ───────────────────────────────────────────────────────────

export interface PublicEntry {
  /** Import specifier, e.g. `@videojs/html/ui/play-button`. */
  specifier: string;
  /** Absolute path of the built declaration file. */
  declarationFile: string;
}

type ExportTarget = string | { types?: string } | null;

function packageDirectories(): string[] {
  const packagesDirectory = join(monorepoRoot, 'packages');

  return readdirSync(packagesDirectory, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];

    const directory = join(packagesDirectory, entry.name);
    if (existsSync(join(directory, 'package.json'))) return [directory];

    return readdirSync(directory, { withFileTypes: true })
      .filter((child) => child.isDirectory() && existsSync(join(directory, child.name, 'package.json')))
      .map((child) => join(directory, child.name));
  });
}

/** Expand a package's `exports` map into one entry per declaration file a consumer can import. */
export function collectPackageEntries(packageDirectory: string): PublicEntry[] {
  // SAFETY: workspace manifests are validated by `pnpm check:workspace`; only these fields are read.
  const manifest = JSON.parse(readFileSync(join(packageDirectory, 'package.json'), 'utf8')) as {
    name: string;
    private?: boolean;
    exports?: Record<string, ExportTarget>;
  };
  if (manifest.private || EXCLUDED_PACKAGES.has(manifest.name) || typeof manifest.exports !== 'object') return [];

  const entries: PublicEntry[] = [];

  for (const [key, target] of Object.entries(manifest.exports)) {
    const types = typeof target === 'string' ? target : target?.types;
    if (!types?.endsWith('.d.ts')) continue;

    const subpath = key === '.' ? '' : key.slice(1);

    if (!types.includes('*')) {
      entries.push({ specifier: `${manifest.name}${subpath}`, declarationFile: join(packageDirectory, types) });
      continue;
    }

    // SAFETY: `types.includes('*')` was checked above, so the split has a prefix and a suffix.
    const [prefix, suffix] = types.split('*') as [string, string];
    const searchRoot = join(packageDirectory, dirname(`${prefix}x`));

    for (const file of walkFiles(searchRoot, (path) => path.endsWith('.d.ts'))) {
      const relativePath = `./${relative(packageDirectory, file).split(sep).join('/')}`;
      if (!relativePath.startsWith(prefix) || !relativePath.endsWith(suffix)) continue;

      const star = relativePath.slice(prefix.length, relativePath.length - suffix.length);

      if (star) entries.push({ specifier: `${manifest.name}${subpath.replace('*', star)}`, declarationFile: file });
    }
  }

  return entries;
}

export interface PublicExport {
  /** Declaration name in source; `default` for a module's default export. */
  name: string;
  /** Names consumers import it by. */
  exportedNames: Set<string>;
  specifiers: Set<string>;
  /** Source file owning the declaration, or the built declaration file when no source match exists. */
  file: string;
  /** Whether `file` is the authored source (and so fixable). */
  hasSource: boolean;
  tags: Set<string>;
}

/** Bundled declaration files wrap `export * as X` namespaces in synthetic `*_exports` modules. */
function isSyntheticNamespace(name: string): boolean {
  return /_exports(?:\$\d+)?$/.test(name);
}

/** Map `packages/<pkg>/dist[/dev|/default]/<path>.d.ts` back to its `src/` module. */
export function sourcePathFor(declarationFile: string): string | undefined {
  const match = declarationFile.match(/^(.*)[\\/]dist[\\/](?:dev[\\/]|default[\\/])?(.*)\.d\.ts$/);
  if (!match) return undefined;

  const base = join(match[1]!, 'src', match[2]!);

  return ['.ts', '.tsx', '/index.ts', '/index.tsx'].map((extension) => `${base}${extension}`).find(existsSync);
}

const sourceFiles = new Map<string, ts.SourceFile>();

function parseSource(filePath: string, text = readFileSync(filePath, 'utf8')): ts.SourceFile {
  const kind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;

  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, kind);
}

function cachedSource(filePath: string): ts.SourceFile {
  let sourceFile = sourceFiles.get(filePath);

  if (!sourceFile) {
    sourceFile = parseSource(filePath);
    sourceFiles.set(filePath, sourceFile);
  }

  return sourceFile;
}

/** The statement a declaration's JSDoc attaches to. */
export type DocumentableNode = ts.Statement;

/** Find the top-level statements declaring `name` in a source file; `default` finds `export default`. */
export function findDeclarations(sourceFile: ts.SourceFile, name: string): DocumentableNode[] {
  return sourceFile.statements.filter((statement) => {
    if (name === 'default') {
      if (ts.isExportAssignment(statement)) return !statement.isExportEquals;

      const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;

      return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
    }

    if (ts.isVariableStatement(statement)) {
      return statement.declarationList.declarations.some(
        (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name
      );
    }

    // SAFETY: only read after the kind guards below confirm a named declaration statement.
    const declarationName = (statement as ts.DeclarationStatement).name;

    return (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement) ||
        ts.isModuleDeclaration(statement)) &&
      declarationName !== undefined &&
      ts.isIdentifier(declarationName) &&
      declarationName.text === name
    );
  });
}

function jsDocTagNames(nodes: readonly ts.Node[]): Set<string> {
  const names = new Set<string>();

  for (const node of nodes) {
    const target = ts.isVariableStatement(node) ? node.declarationList.declarations[0]! : node;

    for (const tag of ts.getJSDocTags(target)) names.add(tag.tagName.text);
  }

  return names;
}

function isCheckedDeclaration(fileName: string): boolean {
  const relativePath = relative(monorepoRoot, fileName).split(sep).join('/');

  return (
    relativePath.startsWith('packages/') &&
    !relativePath.split('/').includes('node_modules') &&
    !UNCHECKED_PACKAGE_DIRECTORIES.some((directory) => relativePath.startsWith(directory))
  );
}

/** Resolve every export of every public entry to its authored declaration, deduplicated across re-exports. */
export function collectPublicExports(entries: readonly PublicEntry[]): PublicExport[] {
  const program = ts.createProgram(
    entries.map((entry) => entry.declarationFile),
    {
      noEmit: true,
      skipLibCheck: true,
      types: [],
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
    }
  );
  const checker = program.getTypeChecker();
  const exports = new Map<string, PublicExport>();

  for (const entry of entries) {
    const sourceFile = program.getSourceFile(entry.declarationFile);
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;

    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const declaration = symbol.declarations?.find((node) => isCheckedDeclaration(node.getSourceFile().fileName));
      // Consumers never see JSDoc on `export * as X`, so namespaces are checked through their members.
      if (!declaration || isSyntheticNamespace(exported.name) || isSyntheticNamespace(symbol.name)) continue;

      // Bundled declarations rename default exports to `_default` and suffix colliding names, e.g. `IconProps$1`.
      const isDefault = exported.name === 'default' || symbol.name === '_default';
      const name = isDefault ? 'default' : symbol.name.replace(/\$\d+$/, '');
      const declarationFile = declaration.getSourceFile().fileName;
      const sourcePath = sourcePathFor(declarationFile);
      const sourceDeclarations = sourcePath ? findDeclarations(cachedSource(sourcePath), name) : [];
      const hasSource = sourceDeclarations.length > 0;
      const file = hasSource ? sourcePath! : declarationFile;
      const key = `${file}#${name}`;

      let record = exports.get(key);

      if (!record) {
        const tags = hasSource
          ? jsDocTagNames(sourceDeclarations)
          : new Set(symbol.getJsDocTags(checker).map((tag) => tag.name));

        record = { name, exportedNames: new Set(), specifiers: new Set(), file, hasSource, tags };
        exports.set(key, record);
      }

      record.exportedNames.add(exported.name);
      record.specifiers.add(entry.specifier);
    }
  }

  return [...exports.values()];
}

// ── Classification ───────────────────────────────────────────────────────────

export type Stability = 'stable' | 'experimental' | 'internal';

/** The stability the docs give an export: stable or experimental when a page documents it, internal otherwise. */
export function documentedStability(
  record: Pick<PublicExport, 'name' | 'exportedNames' | 'specifiers'>,
  coverage: Coverage
): Stability {
  const names = [record.name, ...record.exportedNames].filter((name) => name !== 'default');
  const specifiers = record.name === 'default' ? [...record.specifiers] : [];
  const covers = (set: ReadonlySet<string>, modules: readonly string[]) =>
    names.some((name) => isCoveredName(name, set)) ||
    specifiers.some((specifier) => matchesModulePattern(specifier, modules));
  if (covers(coverage.stable, coverage.stableModules)) return 'stable';

  if (covers(coverage.unstable, coverage.unstableModules)) return 'experimental';

  return 'internal';
}

/** The tag `--fix` adds when `record` lacks one its stability accepts, or `undefined` when it complies. */
export function missingTag(
  record: Pick<PublicExport, 'tags'>,
  stability: Stability
): 'experimental' | 'internal' | undefined {
  if (stability === 'stable') return undefined;

  return ACCEPTED_TAGS[stability].some((tag) => record.tags.has(tag)) ? undefined : stability;
}

// ── Fix ──────────────────────────────────────────────────────────────────────

/** Return `source` with `@<tag>` added to the JSDoc of `node`, creating the comment when absent. */
export function addTag(source: string, sourceFile: ts.SourceFile, node: DocumentableNode, tag: string): string {
  const start = node.getStart(sourceFile);
  const jsDoc = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc).at(-1);
  const indent = source.slice(source.lastIndexOf('\n', start - 1) + 1, start).match(/^[ \t]*/)![0];

  if (!jsDoc) return `${source.slice(0, start)}/** @${tag} */\n${indent}${source.slice(start)}`;

  const comment = source.slice(jsDoc.getStart(sourceFile), jsDoc.end);
  const lines = comment
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, '').trimEnd());

  while (lines.length > 0 && !lines[0]!.trim()) lines.shift();

  while (lines.length > 0 && !lines.at(-1)!.trim()) lines.pop();

  const hasTags = lines.some((line) => line.trimStart().startsWith('@'));
  const body = [...lines, ...(lines.length > 0 && !hasTags ? [''] : []), `@${tag}`];
  const replacement = [
    '/**',
    ...body.map((line) => (line ? `${indent} * ${line}` : `${indent} *`)),
    `${indent} */`,
  ].join('\n');

  return `${source.slice(0, jsDoc.getStart(sourceFile))}${replacement}${source.slice(jsDoc.end)}`;
}

/** Tag declarations in one source file, applying edits bottom-up so offsets stay valid. Returns the edit count. */
export function fixSourceFile(filePath: string, fixes: ReadonlyMap<string, string>): number {
  let source = readFileSync(filePath, 'utf8');
  const sourceFile = parseSource(filePath, source);
  // Every overload carries its own JSDoc, so each declaration of the name gets the tag.
  const edits = [...fixes]
    .flatMap(([name, tag]) => findDeclarations(sourceFile, name).map((node) => ({ node, tag })))
    .filter((edit, index, all) => all.findIndex((other) => other.node === edit.node) === index)
    .sort((a, b) => b.node.getStart(sourceFile) - a.node.getStart(sourceFile));

  for (const { node, tag } of edits) source = addTag(source, sourceFile, node, tag);

  writeFileSync(filePath, source);
  return edits.length;
}

// ── Docs imports ─────────────────────────────────────────────────────────────

export interface DocsImport {
  file: string;
  name: string;
  specifier: string;
}

/** Collect `@videojs/*` imports from docs code and demo sources. `default` stands for a default or dynamic import. */
export function collectImports(source: string, file: string): DocsImport[] {
  const imports: DocsImport[] = [];

  for (const [, defaultName, specifiers, staticSpecifier, dynamicSpecifier] of source.matchAll(IMPORT_PATTERN)) {
    const specifier = (staticSpecifier ?? dynamicSpecifier)!;

    if (defaultName || dynamicSpecifier) imports.push({ file, name: 'default', specifier });

    for (const part of specifiers?.split(',') ?? []) {
      const name = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0];

      if (name) imports.push({ file, name, specifier });
    }
  }

  return imports;
}

function collectDocsImports(siteDirectory: string): DocsImport[] {
  const docsDirectory = join(siteDirectory, 'src/content/docs');
  const pages = walkFiles(docsDirectory, (path) => path.endsWith('.mdx')).filter(
    (path) => !relative(docsDirectory, path).startsWith('writing-style')
  );
  const demos = walkFiles(join(siteDirectory, 'src/components/docs/demos'), (path) =>
    /\.(?:[jt]sx?|astro|html)$/.test(path)
  );

  return [...pages, ...demos].flatMap((file) => collectImports(readFileSync(file, 'utf8'), file));
}

/** Docs imports of internal packages or of exports the docs don't make stable. */
export function findUnstableImports(
  imports: readonly DocsImport[],
  stabilities: ReadonlyMap<string, Stability>
): Array<DocsImport & { reason: string }> {
  return imports.flatMap((entry) => {
    if (INTERNAL_PACKAGE_PATTERN.test(entry.specifier)) return [{ ...entry, reason: 'internal package' }];

    const key = `${entry.specifier}#${entry.name}`;
    const stability = stabilities.get(key);

    return stability && stability !== 'stable' ? [{ ...entry, reason: stability }] : [];
  });
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function main(): void {
  const fix = process.argv.includes('--fix');
  const siteDirectory = resolve(scriptPath, '..', '..');
  const entries = packageDirectories().flatMap(collectPackageEntries);
  const missing = entries.filter((entry) => !existsSync(entry.declarationFile));

  if (missing.length > 0) {
    console.error(`✗ ${missing.length} declaration entry points are missing — run \`pnpm build:packages\` first.`);

    for (const entry of missing.slice(0, 10)) console.error(`  ${entry.specifier}`);

    process.exit(1);
  }

  const coverage = collectCoverage(siteDirectory);
  const exports = collectPublicExports(entries);
  const stabilities = new Map<string, Stability>();
  const violations: Array<{ record: PublicExport; tag: 'experimental' | 'internal' }> = [];

  for (const record of exports) {
    const stability = documentedStability(record, coverage);
    const tag = missingTag(record, stability);

    for (const specifier of record.specifiers) {
      for (const name of record.exportedNames) stabilities.set(`${specifier}#${name}`, stability);
    }

    if (tag) violations.push({ record, tag });
  }

  const warnings = findUnstableImports(collectDocsImports(siteDirectory), stabilities);

  for (const warning of warnings) {
    console.warn(
      `⚠ ${relative(monorepoRoot, warning.file)}  imports ${warning.name} from ${warning.specifier} (${warning.reason})`
    );
  }

  if (warnings.length > 0) console.warn(`⚠ ${warnings.length} docs imports use APIs that aren't stable.\n`);

  violations.sort((a, b) => a.record.file.localeCompare(b.record.file) || a.record.name.localeCompare(b.record.name));

  if (violations.length === 0) {
    console.log(`✓ All ${exports.length} checked public exports are documented or tagged.`);
    return;
  }

  if (fix) {
    const byFile = new Map<string, Map<string, string>>();
    let fixed = 0;

    for (const { record, tag } of violations) {
      if (!record.hasSource) continue;

      const fixes = byFile.get(record.file) ?? new Map<string, string>();

      fixes.set(record.name, tag);
      byFile.set(record.file, fixes);
    }

    for (const [file, fixes] of byFile) fixed += fixSourceFile(file, fixes);

    console.log(`✓ Tagged ${fixed} declarations in ${byFile.size} files.`);

    const unfixable = violations.filter(({ record }) => !record.hasSource);
    if (unfixable.length === 0) return;

    console.error(`✗ ${unfixable.length} exports have no matching source declaration; tag them by hand:`);

    for (const { record, tag } of unfixable) {
      console.error(`  ${relative(monorepoRoot, record.file)}  ${record.name}  (@${tag})`);
    }

    process.exit(1);
  }

  for (const { record, tag } of violations) {
    console.error(
      `✗ ${relative(monorepoRoot, record.file)}  ${record.name}  needs @${tag}  (${[...record.specifiers][0]})`
    );
  }

  console.error(
    `\n✗ ${violations.length} public exports need a stability tag.\n` +
      '  Exports are stable only when a reference page documents them (see writing-style/write-references).\n' +
      '  Tag the rest `@internal`, or `@experimental` when a `stability: unstable` page documents them.\n' +
      '  `pnpm -F site check:api-stability --fix` adds the missing tags.'
  );
  process.exit(1);
}

const isEntrypoint = process.argv[1] && resolve(process.argv[1]) === resolve(scriptPath);

if (isEntrypoint) main();
