/**
 * Enforce the public API stability rule: every export a published package exposes is either documented on the site or
 * marked unstable in its JSDoc (`@experimental`, or the stronger `@internal` / `@deprecated`).
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

/** Tags that mark an export as outside the stable, documented API. `--fix` adds the first. */
export const UNSTABLE_TAGS = ['experimental', 'internal', 'deprecated'] as const;

/** Suffixes of companion exports documented by their base name's page (props/state tables, element classes, …). */
const COMPANION_SUFFIXES = ['Props', 'State', 'Element', 'Options', 'Result'];

/** `@videojs/cdn` repackages `@videojs/html` as script-tag bundles, so html owns those declarations. */
const EXCLUDED_PACKAGES = new Set(['@videojs/cdn']);

const IDENTIFIER_PATTERN = /[A-Za-z_$][\w$]*/g;
const MEMBER_PATTERN = /\b([A-Z][\w$]*)\.([A-Z][\w$]*)\b/g;
const TAG_NAME_PATTERN = /\bmedia-[a-z0-9]+(?:-[a-z0-9]+)*\b/g;
const FENCE_PATTERN = /^([ \t]*)(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^\1\2[ \t]*$/gm;
const INLINE_CODE_PATTERN = /`([^`\n]+)`/g;
const JSX_TAG_PATTERN = /<[A-Z][\w.]*\b[^>]*>/g;
const FEATURE_IMPORTS_PATTERN = /<FeatureImports\b[^>]*\bfeature="([^"]+)"/g;
const COMPONENT_IMPORTS_HTML_PATTERN = /<ComponentImports\b[^>]*\bhtml=(?:"([^"]+)"|\{\[([^\]]*)\]\})/g;
const VIDEOJS_IMPORT_PATTERN = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]@videojs\/[^'"]+['"]/g;

// ── Documented names ─────────────────────────────────────────────────────────

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

function addCode(names: Set<string>, code: string): void {
  for (const [token] of code.matchAll(IDENTIFIER_PATTERN)) names.add(token);

  // `<TimeSlider.Chapters>` documents the part the React namespace flattens to `TimeSliderChapters*`.
  for (const [, owner, member] of code.matchAll(MEMBER_PATTERN)) names.add(`${owner}${member}`);

  // `<media-time-slider-chapters>` documents the `TimeSliderChapters*` element class.
  for (const [tagName] of code.matchAll(TAG_NAME_PATTERN)) names.add(pascalCase(tagName.slice('media-'.length)));
}

/**
 * Collect names a docs page shows to readers: code spans, fenced code, frontmatter, and doc-component props, plus the
 * imports the reference components render from those props. Prose is ignored so ordinary words don't count.
 */
export function collectMdxNames(source: string, names: Set<string> = new Set()): Set<string> {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/);
  let body = frontmatter ? source.slice(frontmatter[0].length) : source;

  if (frontmatter) addCode(names, frontmatter[1]!);

  body = body.replace(FENCE_PATTERN, (_match, _indent, _fence, code: string) => {
    addCode(names, code);
    return '';
  });

  for (const [, code] of body.matchAll(INLINE_CODE_PATTERN)) addCode(names, code!);

  for (const [tag] of body.matchAll(JSX_TAG_PATTERN)) addCode(names, tag);

  for (const [, feature] of body.matchAll(FEATURE_IMPORTS_PATTERN)) names.add(`${feature}Feature`);

  for (const [, single, list] of body.matchAll(COMPONENT_IMPORTS_HTML_PATTERN)) {
    const entries = single ? [single] : [...list!.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]!);

    for (const entry of entries) names.add(pascalCase(entry));
  }

  return names;
}

/** Collect names imported from `@videojs/*` by a demo whose source the docs display. */
export function collectDemoNames(source: string, names: Set<string> = new Set()): Set<string> {
  for (const [, specifiers] of source.matchAll(VIDEOJS_IMPORT_PATTERN)) {
    for (const specifier of specifiers!.split(',')) {
      const name = specifier
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0];

      if (name) names.add(name);
    }
  }

  return names;
}

export function collectDocumentedNames(siteDirectory: string): Set<string> {
  const names = new Set<string>();

  for (const file of walkFiles(join(siteDirectory, 'src/content/docs'), (path) => /\.mdx?$/.test(path))) {
    collectMdxNames(readFileSync(file, 'utf8'), names);
  }

  for (const file of walkFiles(join(siteDirectory, 'src/components/docs/demos'), (path) => /\.[jt]sx?$/.test(path))) {
    collectDemoNames(readFileSync(file, 'utf8'), names);
  }

  return names;
}

export function isDocumentedName(name: string, documented: ReadonlySet<string>): boolean {
  const candidates = [name];

  for (const suffix of COMPANION_SUFFIXES) {
    if (name.length > suffix.length && name.endsWith(suffix)) candidates.push(name.slice(0, -suffix.length));
  }

  // `UseHotkeyOptions` belongs to `useHotkey`.
  return candidates.some(
    (candidate) => documented.has(candidate) || documented.has(candidate[0]!.toLowerCase() + candidate.slice(1))
  );
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
  /** Declaration name in source. */
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

function parseSource(filePath: string): ts.SourceFile {
  let sourceFile = sourceFiles.get(filePath);

  if (!sourceFile) {
    const kind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;

    sourceFile = ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true, kind);
    sourceFiles.set(filePath, sourceFile);
  }

  return sourceFile;
}

/** The statement a declaration's JSDoc attaches to. */
export type DocumentableNode = ts.Statement;

/** Find the top-level statements declaring `name` in a source file. */
export function findDeclarations(sourceFile: ts.SourceFile, name: string): DocumentableNode[] {
  return sourceFile.statements.filter((statement) => {
    if (ts.isVariableStatement(statement)) {
      return statement.declarationList.declarations.some(
        (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name
      );
    }

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

function isRepositoryDeclaration(fileName: string): boolean {
  const relativePath = relative(monorepoRoot, fileName);

  return relativePath.startsWith(`packages${sep}`) && !relativePath.split(sep).includes('node_modules');
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
      const declaration = symbol.declarations?.find((node) => isRepositoryDeclaration(node.getSourceFile().fileName));
      if (!declaration || isSyntheticNamespace(exported.name)) continue;

      // Bundled declarations suffix colliding names, e.g. `IconProps$1`.
      const name = symbol.name.replace(/\$\d+$/, '');
      const declarationFile = declaration.getSourceFile().fileName;
      const sourcePath = sourcePathFor(declarationFile);
      const sourceDeclarations = sourcePath ? findDeclarations(parseSource(sourcePath), name) : [];
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

// ── Check and fix ────────────────────────────────────────────────────────────

export function isUnstable(record: Pick<PublicExport, 'tags'>): boolean {
  return UNSTABLE_TAGS.some((tag) => record.tags.has(tag));
}

export function isDocumented(record: Pick<PublicExport, 'name' | 'exportedNames'>, documented: ReadonlySet<string>) {
  return [record.name, ...record.exportedNames].some((name) => isDocumentedName(name, documented));
}

/** Return `source` with `@experimental` added to the JSDoc of `node`, creating the comment when absent. */
export function addExperimentalTag(source: string, sourceFile: ts.SourceFile, node: DocumentableNode): string {
  const start = node.getStart(sourceFile);
  const jsDoc = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc).at(-1);
  const indent = source.slice(source.lastIndexOf('\n', start - 1) + 1, start).match(/^[ \t]*/)![0];

  if (!jsDoc) return `${source.slice(0, start)}/** @experimental */\n${indent}${source.slice(start)}`;

  const comment = source.slice(jsDoc.getStart(sourceFile), jsDoc.end);
  const lines = comment
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/, '').trimEnd());

  while (lines.length > 0 && !lines[0]!.trim()) lines.shift();

  while (lines.length > 0 && !lines.at(-1)!.trim()) lines.pop();

  const hasTags = lines.some((line) => line.trimStart().startsWith('@'));
  const body = [...lines, ...(lines.length > 0 && !hasTags ? [''] : []), '@experimental'];
  const replacement = [
    '/**',
    ...body.map((line) => (line ? `${indent} * ${line}` : `${indent} *`)),
    `${indent} */`,
  ].join('\n');

  return `${source.slice(0, jsDoc.getStart(sourceFile))}${replacement}${source.slice(jsDoc.end)}`;
}

/** Tag each named declaration in one source file, applying edits bottom-up so offsets stay valid. */
export function fixSourceFile(filePath: string, names: readonly string[]): number {
  let source = readFileSync(filePath, 'utf8');
  const kind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, kind);
  const nodes = names
    .map((name) => findDeclarations(sourceFile, name)[0])
    .filter((node): node is DocumentableNode => node !== undefined)
    .filter((node, index, all) => all.indexOf(node) === index)
    .sort((a, b) => b.getStart(sourceFile) - a.getStart(sourceFile));

  for (const node of nodes) source = addExperimentalTag(source, sourceFile, node);

  writeFileSync(filePath, source);
  return nodes.length;
}

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

  const documented = collectDocumentedNames(siteDirectory);
  const exports = collectPublicExports(entries);
  const violations = exports
    .filter((record) => !isUnstable(record) && !isDocumented(record, documented))
    .sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name));

  if (violations.length === 0) {
    console.log(`✓ All ${exports.length} public exports are documented or marked unstable.`);
    return;
  }

  if (fix) {
    const byFile = new Map<string, PublicExport[]>();
    let fixed = 0;

    for (const record of violations) {
      if (record.hasSource) byFile.set(record.file, [...(byFile.get(record.file) ?? []), record]);
    }

    for (const [file, records] of byFile)
      fixed += fixSourceFile(
        file,
        records.map((record) => record.name)
      );

    console.log(`✓ Added @experimental to ${fixed} declarations in ${byFile.size} files.`);

    const unfixable = violations.filter((record) => !record.hasSource);
    if (unfixable.length === 0) return;

    console.error(`✗ ${unfixable.length} exports have no matching source declaration; tag them by hand:`);

    for (const record of unfixable) console.error(`  ${relative(monorepoRoot, record.file)}  ${record.name}`);

    process.exit(1);
  }

  for (const record of violations) {
    const specifier = [...record.specifiers][0];

    console.error(`✗ ${relative(monorepoRoot, record.file)}  ${record.name}  (${specifier})`);
  }

  console.error(
    `\n✗ ${violations.length} public exports are not documented on the site and not marked unstable.\n` +
      '  Document them, or mark them with `@experimental` (or `@internal` / `@deprecated`).\n' +
      '  `pnpm -F site check:api-stability --fix` adds `@experimental` to each one.'
  );
  process.exit(1);
}

const isEntrypoint = process.argv[1] && resolve(process.argv[1]) === resolve(scriptPath);

if (isEntrypoint) main();
