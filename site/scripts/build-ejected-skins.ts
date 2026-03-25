/**
 * Build ejected skin snippets for copy-paste usage.
 *
 * Produces `site/src/content/ejected-skins.json` with:
 * - HTML skins: rendered HTML templates with inline SVGs and resolved classes
 * - React skins: TSX (with types) and JSX (types stripped) with inline SVGs
 * - CSS variants include a `css` field with all @imports resolved
 * - Tailwind variants omit the `css` field (users bring their own Tailwind)
 *
 * Prerequisites: `pnpm build:packages` (at minimum icons, skins, utils).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative as relativePath, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { resolveImports } from '../../build/plugins/resolve-css-imports.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const PACKAGES_ROOT = resolve(ROOT, 'packages');
const PACKAGE_MANIFEST_CACHE = new Map<string, PackageManifest>();

const PREFIX = '\x1b[35m[ejected-skins]\x1b[0m';
const HTML_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@videojs/html/cdn';
const DEMO_VIDEO_SRC = 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4';
const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, '\x1b[33mwarn:\x1b[0m', ...args),
  error: (...args: unknown[]) => console.error(PREFIX, '\x1b[31merror:\x1b[0m', ...args),
};

const SKINS_SRC = resolve(ROOT, 'packages/skins/src');
const OUTPUT = resolve(ROOT, 'site/src/content/ejected-skins.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PackageExportTarget = string | Record<string, string>;

interface PackageManifest {
  name: string;
  exports?: Record<string, PackageExportTarget>;
}

interface HtmlSkinDef {
  id: string;
  name: string;
  platform: 'html';
  style: 'css' | 'tailwind';
  template: string;
  css?: string;
  iconSet: 'default' | 'minimal';
  tailwindModule?: string;
}

interface ReactSkinDef {
  id: string;
  name: string;
  platform: 'react';
  style: 'css' | 'tailwind';
  source: string;
  css?: string;
}

type SkinDef = HtmlSkinDef | ReactSkinDef;
type MediaType = 'video' | 'audio';

function getSkinMediaType(skin: SkinDef): MediaType {
  return skin.id.includes('audio') ? 'audio' : 'video';
}

interface EjectedSkinEntry {
  id: string;
  name: string;
  platform: 'html' | 'react';
  style: 'css' | 'tailwind';
  html?: string;
  tsx?: string;
  jsx?: string;
  css?: string;
}

interface PackageSpecifierParts {
  packageDir: string;
  packageName: string;
  subpath: string;
}

// ---------------------------------------------------------------------------
// Package resolution
// ---------------------------------------------------------------------------

function parsePackageSpecifier(specifier: string): PackageSpecifierParts {
  const parts = specifier.split('/');

  if (parts.length < 2 || parts[0] !== '@videojs') {
    throw new Error(`Expected a @videojs package specifier, got "${specifier}"`);
  }

  const packageName = `${parts[0]}/${parts[1]}`;
  const packageDir = resolve(PACKAGES_ROOT, parts[1]);
  const subpath = parts.length > 2 ? `./${parts.slice(2).join('/')}` : '.';

  return { packageDir, packageName, subpath };
}

function readPackageManifest(packageDir: string): PackageManifest {
  const cached = PACKAGE_MANIFEST_CACHE.get(packageDir);
  if (cached) {
    return cached;
  }

  const manifestPath = resolve(packageDir, 'package.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing package manifest: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as PackageManifest;
  PACKAGE_MANIFEST_CACHE.set(packageDir, manifest);

  return manifest;
}

function matchExportPattern(pattern: string, subpath: string): string | null {
  if (!pattern.includes('*')) {
    return pattern === subpath ? '' : null;
  }

  const [prefix, suffix] = pattern.split('*');
  if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) {
    return null;
  }

  return subpath.slice(prefix.length, subpath.length - suffix.length);
}

function selectExportTarget(exportTarget: PackageExportTarget, specifier: string, packageName: string): string {
  if (typeof exportTarget === 'string') {
    return exportTarget;
  }

  const preferredConditions = ['default', 'development', 'import', 'module', 'node', 'types'];

  for (const condition of preferredConditions) {
    const target = exportTarget[condition];
    if (target) {
      return target;
    }
  }

  throw new Error(`Package "${packageName}" exports "${specifier}" but does not provide a supported target condition`);
}

function resolvePackageExportFile(specifier: string): string {
  const { packageDir, packageName, subpath } = parsePackageSpecifier(specifier);
  const manifest = readPackageManifest(packageDir);
  const exportsField = manifest.exports;

  if (!exportsField) {
    throw new Error(`Package "${packageName}" does not define exports`);
  }

  const exactTarget = exportsField[subpath];
  if (exactTarget) {
    const target = selectExportTarget(exactTarget, specifier, packageName);
    const filePath = resolve(packageDir, target.replace(/^\.\//, ''));

    if (!existsSync(filePath)) {
      throw new Error(`Resolved file does not exist: ${filePath}`);
    }

    return filePath;
  }

  for (const [pattern, exportTarget] of Object.entries(exportsField)) {
    const wildcardValue = matchExportPattern(pattern, subpath);
    if (wildcardValue === null) {
      continue;
    }

    const targetPattern = selectExportTarget(exportTarget, specifier, packageName);
    const filePath = resolve(packageDir, targetPattern.replace('*', wildcardValue).replace(/^\.\//, ''));

    if (!existsSync(filePath)) {
      throw new Error(`Resolved file does not exist: ${filePath}`);
    }

    return filePath;
  }

  throw new Error(`Package "${packageName}" does not export "${subpath}"`);
}

/** Resolve a `@videojs/*` package specifier to its built dist file URL. */
function pkgDistUrl(specifier: string): string {
  return pathToFileURL(resolvePackageExportFile(specifier)).href;
}

function collectPackageSpecifiers(source: string): string[] {
  const specifiers = new Set<string>();
  const importRegex = /from\s+['"](@videojs\/[^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(source)) !== null) {
    specifiers.add(match[1]);
  }

  return [...specifiers];
}

function validatePackageImports(source: string, sourcePath: string): void {
  for (const specifier of collectPackageSpecifiers(source)) {
    try {
      resolvePackageExportFile(specifier);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid package import "${specifier}" in "${sourcePath}": ${message}`);
    }
  }
}

function toRepoPath(filePath: string): string {
  return relativePath(ROOT, filePath);
}

function createSourceFile(filePath: string, source: string): ts.SourceFile {
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function isDirectivePrologueStatement(statement: ts.Statement): boolean {
  return ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression);
}

type NamedDeclaration =
  | ts.FunctionDeclaration
  | ts.ClassDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration;

function isNamedDeclaration(statement: ts.Statement): statement is NamedDeclaration {
  return (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  );
}

function getStatementName(statement: ts.Statement): string | null {
  if (isNamedDeclaration(statement)) {
    return statement.name?.text ?? null;
  }

  if (ts.isVariableStatement(statement)) {
    const decl = statement.declarationList.declarations[0];
    return decl && ts.isIdentifier(decl.name) ? decl.name.text : null;
  }

  return null;
}

function parseNames(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isRelativeImport(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

function resolveRelativeModulePath(importerPath: string, specifier: string): string {
  const basePath = resolve(dirname(importerPath), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    resolve(basePath, 'index.ts'),
    resolve(basePath, 'index.tsx'),
    resolve(basePath, 'index.js'),
    resolve(basePath, 'index.jsx'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Could not resolve relative import "${specifier}" from "${toRepoPath(importerPath)}"`);
}

function stripExportModifier(text: string): string {
  return text.replace(/^export\s+default\s+/, '').replace(/^export\s+/, '');
}

function getImportStatementText(source: string, node: ts.ImportDeclaration): string {
  return source.slice(node.getFullStart(), node.getEnd()).trim();
}

function findLocalDeclarationText(sourceFile: ts.SourceFile, localName: string): string | null {
  for (const statement of sourceFile.statements) {
    if (getStatementName(statement) === localName) {
      return statement.getText(sourceFile);
    }
  }

  return null;
}

function getNamedExportText(sourceFile: ts.SourceFile, exportName: string): string | null {
  for (const statement of sourceFile.statements) {
    const isExported = hasExportModifier(statement);

    if (isExported && getStatementName(statement) === exportName) {
      return stripExportModifier(statement.getText(sourceFile));
    }

    if (
      ts.isExportDeclaration(statement) &&
      !statement.moduleSpecifier &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        const exportedName = element.name.text;
        const localName = element.propertyName?.text ?? exportedName;

        if (exportedName === exportName) {
          return findLocalDeclarationText(sourceFile, localName);
        }
      }
    }
  }

  return null;
}

function getLocalDeclarationTexts(sourceFile: ts.SourceFile): Map<string, string> {
  const declarations = new Map<string, string>();

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) continue;

    const name = getStatementName(statement);
    if (!name) continue;

    const text = ts.canHaveModifiers(statement)
      ? stripExportModifier(statement.getText(sourceFile))
      : statement.getText(sourceFile);

    declarations.set(name, text);
  }

  return declarations;
}

function collectDeclarationClosure(
  sourceFile: ts.SourceFile,
  declarationName: string,
  declarations: Map<string, string>,
  seen = new Set<string>()
): string[] {
  if (seen.has(declarationName)) {
    return [];
  }

  const declarationText = declarations.get(declarationName) ?? getNamedExportText(sourceFile, declarationName);
  if (!declarationText) {
    throw new Error(`Could not find declaration "${declarationName}" in "${sourceFile.fileName}"`);
  }

  seen.add(declarationName);

  const identifierRegex = /\b[A-Za-z_]\w*\b/g;
  const dependencyNames = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = identifierRegex.exec(declarationText)) !== null) {
    const identifier = match[0];
    if (identifier !== declarationName && declarations.has(identifier)) {
      dependencyNames.add(identifier);
    }
  }

  const dependencyTexts = [...dependencyNames].flatMap((name) =>
    collectDeclarationClosure(sourceFile, name, declarations, seen)
  );

  return [...dependencyTexts, declarationText];
}

function normalizeImports(source: string): string {
  const sourceFile = createSourceFile('imports.tsx', source);
  const sideEffectImports = new Set<string>();
  const namedImports = new Map<string, Set<string>>();
  const rawImports: string[] = [];
  let bodyStart = 0;

  for (const statement of sourceFile.statements) {
    if (isDirectivePrologueStatement(statement)) {
      bodyStart = statement.getEnd();
      continue;
    }

    if (!ts.isImportDeclaration(statement)) {
      break;
    }

    bodyStart = statement.getEnd();
    const specifier = statement.moduleSpecifier.getText(sourceFile).slice(1, -1);
    const importClause = statement.importClause;

    if (!importClause) {
      sideEffectImports.add(specifier);
      continue;
    }

    const namedBindings = importClause.namedBindings;
    if (importClause.name || (namedBindings && !ts.isNamedImports(namedBindings))) {
      rawImports.push(getImportStatementText(source, statement));
      continue;
    }

    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;

    const names = namedImports.get(specifier) ?? new Set<string>();
    for (const element of namedBindings.elements) {
      const isTypeImport = element.isTypeOnly || /^import\s+type\s/.test(statement.getText(sourceFile));
      names.add(isTypeImport ? `type ${element.getText(sourceFile)}` : element.getText(sourceFile));
    }

    namedImports.set(specifier, names);
  }

  const importLines = [
    ...[...sideEffectImports].map((specifier) => `import '${specifier}';`),
    ...rawImports,
    ...[...namedImports.entries()].map(
      ([specifier, names]) => `import { ${[...names].join(', ')} } from '${specifier}';`
    ),
  ];
  const body = source.slice(bodyStart).replace(/^\s+/, '');

  if (importLines.length === 0) {
    return body;
  }

  return `${importLines.join('\n')}\n\n${body}`;
}

function inlineModuleExport(
  sourceFile: ts.SourceFile,
  importName: string,
  localName: string,
  isTypeOnly: boolean
): string {
  const declarations = getLocalDeclarationTexts(sourceFile);
  const exportTexts = collectDeclarationClosure(sourceFile, importName, declarations);
  const exportText = exportTexts.join('\n\n');

  if (importName === localName) {
    return exportText;
  }

  const aliasKeyword = isTypeOnly ? 'type' : 'const';
  return `${exportText}\n\n${aliasKeyword} ${localName} = ${importName};`;
}

function inlineRelativeImports(source: string, sourcePath: string): string {
  const sourceFile = createSourceFile(sourcePath, source);
  const declarationsToInline: string[] = [];
  const extraImports = new Set<string>();
  const declarationsSeen = new Set<string>();
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }

    const specifier = statement.moduleSpecifier.getText(sourceFile).slice(1, -1);
    if (!isRelativeImport(specifier)) {
      continue;
    }

    const importClause = statement.importClause;
    if (!importClause?.namedBindings || !ts.isNamedImports(importClause.namedBindings) || importClause.name) {
      throw new Error(`Unsupported relative import in "${toRepoPath(sourcePath)}": ${statement.getText(sourceFile)}`);
    }

    const targetPath = resolveRelativeModulePath(sourcePath, specifier);
    const targetSource = readFileSync(targetPath, 'utf-8');
    validatePackageImports(targetSource, toRepoPath(targetPath));
    const transformedTargetSource = inlineRelativeImports(targetSource, targetPath);
    const transformedTargetFile = createSourceFile(targetPath, transformedTargetSource);

    for (const targetStatement of transformedTargetFile.statements) {
      if (isDirectivePrologueStatement(targetStatement)) {
        continue;
      }

      if (!ts.isImportDeclaration(targetStatement)) {
        break;
      }

      const targetSpecifier = targetStatement.moduleSpecifier.getText(transformedTargetFile).slice(1, -1);
      if (isRelativeImport(targetSpecifier)) {
        throw new Error(
          `Relative import remained after inlining in "${toRepoPath(targetPath)}": ${targetStatement.getText(
            transformedTargetFile
          )}`
        );
      }

      extraImports.add(getImportStatementText(transformedTargetSource, targetStatement));
    }

    for (const element of importClause.namedBindings.elements) {
      const importName = element.propertyName?.text ?? element.name.text;
      const localName = element.name.text;
      const declaration = inlineModuleExport(transformedTargetFile, importName, localName, element.isTypeOnly);

      if (!declarationsSeen.has(declaration)) {
        declarationsSeen.add(declaration);
        declarationsToInline.push(declaration);
      }
    }

    replacements.push({
      start: statement.getFullStart(),
      end: statement.getEnd(),
      text: '',
    });
  }

  let transformedSource = source;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    transformedSource = `${transformedSource.slice(0, replacement.start)}${replacement.text}${transformedSource.slice(
      replacement.end
    )}`;
  }

  if (extraImports.size > 0) {
    transformedSource = `${[...extraImports].join('\n')}\n${transformedSource}`;
  }

  if (declarationsToInline.length > 0) {
    const insertPos = findLastImportEnd(transformedSource);
    const block = `\n${declarationsToInline.join('\n\n')}\n`;
    transformedSource = `${transformedSource.slice(0, insertPos)}${block}${transformedSource.slice(insertPos)}`;
  }

  transformedSource = normalizeImports(transformedSource);

  for (const relativeSpecifier of collectRelativeImportSpecifiers(transformedSource)) {
    throw new Error(`Relative import "${relativeSpecifier}" remains in "${toRepoPath(sourcePath)}" after inlining`);
  }

  return transformedSource;
}

function collectRelativeImportSpecifiers(source: string): string[] {
  const specifiers = new Set<string>();
  const importRegex = /from\s+['"]((?:\.\/|\.\.\/)[^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(source)) !== null) {
    specifiers.add(match[1]);
  }

  return [...specifiers];
}

// ---------------------------------------------------------------------------
// Skin definitions
// ---------------------------------------------------------------------------

const SKINS: SkinDef[] = [
  // HTML CSS
  {
    id: 'default-video',
    name: 'Default Video',
    platform: 'html',
    style: 'css',
    template: 'packages/html/src/define/video/skin.ts',
    css: 'packages/html/src/define/video/skin.css',
    iconSet: 'default',
  },
  {
    id: 'default-audio',
    name: 'Default Audio',
    platform: 'html',
    style: 'css',
    template: 'packages/html/src/define/audio/skin.ts',
    css: 'packages/html/src/define/audio/skin.css',
    iconSet: 'default',
  },
  {
    id: 'minimal-video',
    name: 'Minimal Video',
    platform: 'html',
    style: 'css',
    template: 'packages/html/src/define/video/minimal-skin.ts',
    css: 'packages/html/src/define/video/minimal-skin.css',
    iconSet: 'minimal',
  },
  {
    id: 'minimal-audio',
    name: 'Minimal Audio',
    platform: 'html',
    style: 'css',
    template: 'packages/html/src/define/audio/minimal-skin.ts',
    css: 'packages/html/src/define/audio/minimal-skin.css',
    iconSet: 'minimal',
  },

  // HTML Tailwind
  {
    id: 'default-video-tailwind',
    name: 'Default Video (Tailwind)',
    platform: 'html',
    style: 'tailwind',
    template: 'packages/html/src/define/video/skin.tailwind.ts',
    iconSet: 'default',
    tailwindModule: '@videojs/skins/default/tailwind/video.tailwind',
  },
  {
    id: 'default-audio-tailwind',
    name: 'Default Audio (Tailwind)',
    platform: 'html',
    style: 'tailwind',
    template: 'packages/html/src/define/audio/skin.tailwind.ts',
    iconSet: 'default',
    tailwindModule: '@videojs/skins/default/tailwind/audio.tailwind',
  },
  {
    id: 'minimal-video-tailwind',
    name: 'Minimal Video (Tailwind)',
    platform: 'html',
    style: 'tailwind',
    template: 'packages/html/src/define/video/minimal-skin.tailwind.ts',
    iconSet: 'minimal',
    tailwindModule: '@videojs/skins/minimal/tailwind/video.tailwind',
  },
  {
    id: 'minimal-audio-tailwind',
    name: 'Minimal Audio (Tailwind)',
    platform: 'html',
    style: 'tailwind',
    template: 'packages/html/src/define/audio/minimal-skin.tailwind.ts',
    iconSet: 'minimal',
    tailwindModule: '@videojs/skins/minimal/tailwind/audio.tailwind',
  },

  // React CSS
  {
    id: 'default-video-react',
    name: 'Default Video (React)',
    platform: 'react',
    style: 'css',
    source: 'packages/react/src/presets/video/skin.tsx',
    css: 'packages/react/src/presets/video/skin.css',
  },
  {
    id: 'default-audio-react',
    name: 'Default Audio (React)',
    platform: 'react',
    style: 'css',
    source: 'packages/react/src/presets/audio/skin.tsx',
    css: 'packages/react/src/presets/audio/skin.css',
  },
  {
    id: 'minimal-video-react',
    name: 'Minimal Video (React)',
    platform: 'react',
    style: 'css',
    source: 'packages/react/src/presets/video/minimal-skin.tsx',
    css: 'packages/react/src/presets/video/minimal-skin.css',
  },
  {
    id: 'minimal-audio-react',
    name: 'Minimal Audio (React)',
    platform: 'react',
    style: 'css',
    source: 'packages/react/src/presets/audio/minimal-skin.tsx',
    css: 'packages/react/src/presets/audio/minimal-skin.css',
  },

  // React Tailwind
  {
    id: 'default-video-react-tailwind',
    name: 'Default Video (React + Tailwind)',
    platform: 'react',
    style: 'tailwind',
    source: 'packages/react/src/presets/video/skin.tailwind.tsx',
  },
  {
    id: 'default-audio-react-tailwind',
    name: 'Default Audio (React + Tailwind)',
    platform: 'react',
    style: 'tailwind',
    source: 'packages/react/src/presets/audio/skin.tailwind.tsx',
  },
  {
    id: 'minimal-video-react-tailwind',
    name: 'Minimal Video (React + Tailwind)',
    platform: 'react',
    style: 'tailwind',
    source: 'packages/react/src/presets/video/minimal-skin.tailwind.tsx',
  },
  {
    id: 'minimal-audio-react-tailwind',
    name: 'Minimal Audio (React + Tailwind)',
    platform: 'react',
    style: 'tailwind',
    source: 'packages/react/src/presets/audio/minimal-skin.tailwind.tsx',
  },
];

// ---------------------------------------------------------------------------
// CSS resolution
// ---------------------------------------------------------------------------

function resolveCss(cssPath: string): string {
  const abs = resolve(ROOT, cssPath);
  const raw = readFileSync(abs, 'utf-8');
  return resolveImports(raw, dirname(abs), SKINS_SRC);
}

function getHtmlSkinCdnFileName(skin: HtmlSkinDef): string {
  if (skin.id.includes('minimal-video')) {
    return 'video-minimal';
  }

  if (skin.id.includes('minimal-audio')) {
    return 'audio-minimal';
  }

  if (skin.id.includes('video')) {
    return 'video';
  }

  return 'audio';
}

function prependHtmlSkinScripts(html: string, skin: HtmlSkinDef): string {
  const cdnFileName = getHtmlSkinCdnFileName(skin);
  const scriptTag = `<script type="module" src="${HTML_CDN_BASE}/${cdnFileName}.js"></script>`;
  const cssLink = `<link rel="stylesheet" href="./player.css">`;
  const playerTag = getSkinMediaType(skin) === 'audio' ? 'audio-player' : 'video-player';
  const indented = html
    .split('\n')
    .map((l) => (l.length > 0 ? `  ${l}` : l))
    .join('\n');

  return `${scriptTag}\n${cssLink}\n\n<${playerTag}>\n${indented}\n</${playerTag}>`;
}

// ---------------------------------------------------------------------------
// HTML template extraction and evaluation
// ---------------------------------------------------------------------------

/**
 * Extract the body of `getTemplateHTML()` from the source file.
 * Returns the raw template literal content (without the surrounding backticks).
 */
function extractTemplateLiteral(source: string): string {
  // Match: function getTemplateHTML(...) { return /*html*/ `...`; }
  // or:    function getTemplateHTML(...) { return `...`; }
  const match = source.match(
    /function\s+getTemplateHTML\s*\([^)]*\)\s*\{[\s\S]*?return\s+(?:\/\*html\*\/\s*)?`([\s\S]*?)`\s*;?\s*\}/
  );
  if (!match) {
    throw new Error('Could not extract getTemplateHTML template literal');
  }
  return match[1];
}

/**
 * Collect all import names that the template uses from the tailwind module.
 * Parses lines like: `import { foo, bar } from '@videojs/skins/...'`
 * and also picks up re-imports from other modules used in the template.
 */
function parseImportedNames(source: string): Map<string, string> {
  const imports = new Map<string, string>();
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(source)) !== null) {
    const names = match[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const module = match[2];
    for (const name of names) {
      // Handle `foo as bar`
      const parts = name.split(/\s+as\s+/);
      const localName = parts.length > 1 ? parts[1] : parts[0];
      imports.set(localName, module);
    }
  }
  return imports;
}

async function loadRenderIcon(
  iconSet: 'default' | 'minimal'
): Promise<(name: string, attrs?: Record<string, string>) => string> {
  const mod = await import(pkgDistUrl(`@videojs/icons/render/${iconSet}`));
  return mod.renderIcon;
}

async function loadCn(): Promise<(...args: unknown[]) => string> {
  const mod = await import(pkgDistUrl('@videojs/utils/style'));
  return mod.cn;
}

async function loadTailwindTokens(specifier: string): Promise<Record<string, unknown>> {
  return await import(pkgDistUrl(specifier));
}

/**
 * Evaluate the HTML template by replacing `${...}` expressions with
 * their computed values.
 *
 * Uses `new Function()` to evaluate the template literal in a context
 * that provides renderIcon, cn, SEEK_TIME, and all tailwind tokens.
 */
function evaluateTemplate(templateBody: string, context: Record<string, unknown>): string {
  const keys = Object.keys(context);
  const values = Object.values(context);

  // Build a function that returns the evaluated template literal
  const fn = new Function(...keys, `return \`${templateBody}\`;`);
  const html = fn(...values) as string;

  // Clean up whitespace: dedent, trim trailing spaces, and trim outer edges.
  const lines = html.split('\n').map((line) => line.trimEnd());
  const minIndent = lines
    .filter((l) => l.length > 0)
    .reduce((min, l) => Math.min(min, l.length - l.trimStart().length), Infinity);

  return lines
    .map((l) => (l.length > 0 ? l.slice(minIndent) : l))
    .join('\n')
    .trim();
}

/**
 * Replace `<slot name="media">` and `<slot>` (default slot) with a concrete
 * `<video>` or `<audio>` element so the ejected HTML is self-contained.
 */
function replaceSlots(html: string, mediaType: MediaType): string {
  const tag = mediaType === 'audio' ? 'audio' : 'video';
  const playsInline = mediaType === 'video' ? ' playsinline' : '';
  const mediaElement = `<${tag} src="${DEMO_VIDEO_SRC}"${playsInline}></${tag}>`;

  // Replace the deprecated comment + slot="media" + default slot block with the
  // media element, preserving the original indentation.
  html = html.replace(
    /^([ \t]*)<!--\s*@deprecated[^\n]*\n\s*<slot name="media"><\/slot>\n\s*<slot><\/slot>/m,
    `$1${mediaElement}`
  );

  return html;
}

/**
 * Process an HTML skin: extract the template, evaluate it with the right
 * context, and return the rendered HTML string.
 */
async function processHtmlSkin(skin: HtmlSkinDef): Promise<string> {
  const absPath = resolve(ROOT, skin.template);
  const source = readFileSync(absPath, 'utf-8');
  validatePackageImports(source, skin.template);
  const templateBody = extractTemplateLiteral(source);

  const renderIcon = await loadRenderIcon(skin.iconSet);
  const cn = await loadCn();

  // Build context object with all the variables the template needs
  const context: Record<string, unknown> = {
    renderIcon,
    cn,
    SEEK_TIME: 10,
  };

  if (skin.style === 'tailwind') {
    // Load the primary tailwind module
    if (skin.tailwindModule) {
      const tokens = await loadTailwindTokens(skin.tailwindModule);
      Object.assign(context, tokens);
    }

    // Check if the source imports from additional tailwind modules
    const imports = parseImportedNames(source);
    const loadedModules = new Set<string>();
    if (skin.tailwindModule) loadedModules.add(skin.tailwindModule);

    for (const [name, mod] of imports) {
      if (mod.includes('/tailwind/') && !loadedModules.has(mod)) {
        loadedModules.add(mod);
        const extraTokens = await loadTailwindTokens(mod);
        // Only add names that aren't already in context
        if (!(name in context) && name in extraTokens) {
          context[name] = extraTokens[name];
        }
      }
    }
  }

  let html = evaluateTemplate(templateBody, context);
  html = replaceSlots(html, getSkinMediaType(skin));

  return prependHtmlSkinScripts(html, skin);
}

// ---------------------------------------------------------------------------
// React skin processing — inline SVGs, resolve imports, produce TSX + JSX
// ---------------------------------------------------------------------------

/** Convert PascalCase icon component name to kebab-case icon name. */
function componentToIconName(name: string): string {
  return name
    .replace(/Icon$/, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/** Convert HTML SVG attribute names to JSX camelCase equivalents. */
function svgToJsx(svg: string): string {
  return svg
    .replace(/\bstroke-width=/g, 'strokeWidth=')
    .replace(/\bstroke-linecap=/g, 'strokeLinecap=')
    .replace(/\bstroke-linejoin=/g, 'strokeLinejoin=')
    .replace(/\bstroke-dasharray=/g, 'strokeDasharray=')
    .replace(/\bstroke-dashoffset=/g, 'strokeDashoffset=')
    .replace(/\bstroke-miterlimit=/g, 'strokeMiterlimit=')
    .replace(/\bfill-rule=/g, 'fillRule=')
    .replace(/\bclip-rule=/g, 'clipRule=')
    .replace(/\bfill-opacity=/g, 'fillOpacity=')
    .replace(/\bstroke-opacity=/g, 'strokeOpacity=');
}

/** Load the raw icons map from a render dist module. */
async function loadIconsMap(iconSet: 'default' | 'minimal'): Promise<Record<string, string>> {
  const mod = await import(pkgDistUrl(`@videojs/icons/render/${iconSet}`));
  const renderIcon = mod.renderIcon as (name: string) => string;
  const assetsDir = resolve(PACKAGES_ROOT, 'icons/src/assets', iconSet);
  const iconNames = readdirSync(assetsDir)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.replace(/\.svg$/, ''));
  const map: Record<string, string> = {};
  for (const name of iconNames) {
    const svg = renderIcon(name);
    if (svg) map[name] = svg;
  }
  return map;
}

/** Serialize a JS value to source code. */
function serializeValue(value: unknown, indent = 0): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'function') {
    // Function tokens (like `root`) — resolve with false (no shadow DOM)
    return `() => ${JSON.stringify((value as (arg: boolean) => string)(false))}`;
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);
    const pad = '  '.repeat(indent + 1);
    const closePad = '  '.repeat(indent);
    const parts = entries.map(([k, v]) => `${pad}${k}: ${serializeValue(v, indent + 1)}`);
    return `{\n${parts.join(',\n')},\n${closePad}}`;
  }
  return String(value);
}

/** Strip TypeScript types from TSX source to produce plain JSX. */
function tsxToJsx(source: string): string {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
    },
  });
  return result.outputText;
}

// -- React source transforms --
// Each transform removes its import(s) and collects any non-import code
// (const declarations, type defs, inlined components) into `postImport`.
// After all transforms, collected code is inserted after the final import.

/**
 * Remove `cn` import and replace all `cn(...)` calls with template literals.
 * `cn(a, b)` → `` `${a} ${b}` ``, with string literal args inlined directly.
 */
function inlineCn(source: string): string {
  if (!source.match(/import\s+\{[^}]*\bcn\b[^}]*\}\s+from\s+['"]@videojs\/utils\/style['"]/)) {
    return source;
  }
  source = source.replace(/import\s+\{[^}]*\bcn\b[^}]*\}\s+from\s+['"]@videojs\/utils\/style['"];?\n?/g, '');
  return replaceCnCalls(source);
}

/** Convert parsed `cn(...)` args into a template literal expression. */
function cnToConcat(args: string[]): string {
  const isLiteral = (a: string) => /^['"]/.test(a) && /['"]$/.test(a);
  const unwrap = (a: string) => a.slice(1, -1);

  // All string literals → merge into a single quoted string
  if (args.every(isLiteral)) {
    return `'${args.map(unwrap).join(' ')}'`;
  }

  // Build template literal parts
  const parts = args.map((a) => {
    if (isLiteral(a)) return unwrap(a);
    if (a === 'className') return `\${className ?? ''}`;
    return `\${${a}}`;
  });

  return `\`${parts.join(' ')}\``;
}

/** Replace all `cn(...)` calls with simple string concatenation. */
function replaceCnCalls(source: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < source.length) {
    const cnIndex = source.indexOf('cn(', i);
    if (cnIndex === -1) {
      parts.push(source.slice(i));
      break;
    }
    // Ensure `cn(` is a standalone call, not part of another identifier
    if (cnIndex > 0 && /\w/.test(source[cnIndex - 1])) {
      parts.push(source.slice(i, cnIndex + 3));
      i = cnIndex + 3;
      continue;
    }
    parts.push(source.slice(i, cnIndex));

    // Find the matching closing paren
    const argsStart = cnIndex + 3;
    let depth = 1;
    let j = argsStart;
    while (j < source.length && depth > 0) {
      if (source[j] === '(') depth++;
      else if (source[j] === ')') depth--;
      if (depth > 0) j++;
    }
    const argsStr = source.slice(argsStart, j);
    const args = splitTopLevelCommas(argsStr).map((a) => a.trim());

    parts.push(cnToConcat(args));
    i = j + 1; // skip past closing paren
  }
  return parts.join('');
}

/** Split a string by commas that are not inside parentheses, brackets, or template literals. */
function splitTopLevelCommas(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  let templateDepth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === '`') templateDepth = templateDepth > 0 ? templateDepth - 1 : templateDepth + 1;
    else if (ch === ',' && depth === 0 && templateDepth === 0) {
      result.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) result.push(current);
  return result;
}

/** Remove icon imports and generate icon component definitions. */
async function inlineReactIcons(source: string): Promise<{ source: string; iconComponents: string[] }> {
  const sourceFile = createSourceFile('react-skin.tsx', source);
  const iconImport = sourceFile.statements.find((statement) => {
    if (!ts.isImportDeclaration(statement)) {
      return false;
    }

    const specifier = statement.moduleSpecifier.getText(sourceFile).slice(1, -1);
    return /^@videojs\/icons\/react(?:\/(default|minimal))?$/.test(specifier);
  });

  if (!iconImport || !ts.isImportDeclaration(iconImport)) {
    return { source, iconComponents: [] };
  }

  const iconSpecifier = iconImport.moduleSpecifier.getText(sourceFile).slice(1, -1);
  const iconSetMatch = iconSpecifier.match(/@videojs\/icons\/react(?:\/(default|minimal))?/);
  const iconSet = (iconSetMatch?.[1] || 'default') as 'default' | 'minimal';
  const namedBindings = iconImport.importClause?.namedBindings;
  const iconNames =
    namedBindings && ts.isNamedImports(namedBindings) ? namedBindings.elements.map((element) => element.name.text) : [];

  const iconsMap = await loadIconsMap(iconSet);
  const iconComponents: string[] = [];

  for (const componentName of iconNames) {
    const iconName = componentToIconName(componentName);
    const rawSvg = iconsMap[iconName];
    if (!rawSvg) {
      log.warn(`No SVG found for ${componentName} (icon: ${iconName})`);
      continue;
    }
    const jsxSvg = svgToJsx(rawSvg).replace(/^(<svg[^>]*)>/, '$1 {...props}>');
    iconComponents.push(`function ${componentName}(props: ComponentProps<'svg'>): ReactNode {\n  return ${jsxSvg};\n}`);
  }

  // Remove the icon import, keep JSX component calls as-is
  source = `${source.slice(0, iconImport.getFullStart())}${source.slice(iconImport.getEnd())}`;
  return { source, iconComponents };
}

/**
 * Replace `@videojs/skins/*` imports (private package) with inline const
 * declarations containing the resolved token values.
 */
async function inlineSkinTokens(source: string, postImport: string[]): Promise<string> {
  const regex = /import\s+\{([^}]*)\}\s+from\s+['"](@videojs\/skins\/[^'"]+)['"]\s*;?\n?/;
  let match: RegExpMatchArray | null;
  while ((match = source.match(regex)) !== null) {
    const names = match[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const moduleSpec = match[2];
    const mod = await import(pkgDistUrl(moduleSpec));

    const declarations = names.map((name) => `const ${name} = ${serializeValue(mod[name])};`).join('\n');

    source = source.replace(match[0], '');
    postImport.push(declarations);
  }
  return source;
}

/**
 * Consolidate `@/` path alias imports into `@videojs/react`.
 * All UI components and hooks are re-exported from the main package entry.
 */
function rewritePathAliases(source: string): string {
  const aliasRegex = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]@\/[^'"]+['"];?\n?/g;
  const valueNames = new Set<string>();
  const typeNames = new Set<string>();
  const matches: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = aliasRegex.exec(source)) !== null) {
    matches.push(match[0]);
    const isTypeImport = !!match[1];
    const names = match[2]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const name of names) {
      if (isTypeImport || name.startsWith('type ')) {
        typeNames.add(name.replace(/^type\s+/, ''));
      } else {
        valueNames.add(name);
      }
    }
  }

  if (matches.length === 0) return source;

  for (const m of matches) {
    source = source.replace(m, '');
  }

  const allNames = [
    ...valueNames,
    ...[...typeNames].filter((name) => !valueNames.has(name)).map((name) => `type ${name}`),
  ];
  const importLine = `import { ${allNames.join(', ')} } from '@videojs/react';\n`;

  const lastImportIndex = findLastImportEnd(source);
  source = `${source.slice(0, lastImportIndex)}${importLine}${source.slice(lastImportIndex)}`;

  return source;
}

/**
 * Rewrite imports from private/internal packages:
 * - `@videojs/core/dom` → merge into `@videojs/react` (re-exported publicly)
 * - `@videojs/utils/predicate` → inline function definitions
 * - `isRenderProp` from `@videojs/react` → inline (not a public export)
 */
function inlinePrivatePackages(source: string): { source: string; utilities: string[] } {
  const utilities: string[] = [];

  // Merge @videojs/core/dom imports into @videojs/react
  const coreDomMatch = source.match(/import\s+\{([^}]+)\}\s+from\s+['"]@videojs\/core\/dom['"]/);
  if (coreDomMatch) {
    const names = coreDomMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    source = source.replace(/import\s+\{[^}]+\}\s+from\s+['"]@videojs\/core\/dom['"];?\n?/g, '');
    source = source.replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]@videojs\/react['"]/,
      (_, existing: string) => `import { ${existing.trim()}, ${names.join(', ')} } from '@videojs/react'`
    );
  }

  // Inline @videojs/utils/predicate
  const predicateMatch = source.match(/import\s+\{([^}]+)\}\s+from\s+['"]@videojs\/utils\/predicate['"]/);
  if (predicateMatch) {
    source = source.replace(/import\s+\{[^}]+\}\s+from\s+['"]@videojs\/utils\/predicate['"];?\n?/g, '');
    const names = predicateMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const name of names) {
      if (name === 'isString') {
        utilities.push("function isString(value: unknown): value is string {\n  return typeof value === 'string';\n}");
      }
    }
  }

  // Inline isRenderProp — not a public export from @videojs/react
  const reactImportMatch = source.match(/import\s+\{([^}]+)\}\s+from\s+['"]@videojs\/react['"]/);
  if (reactImportMatch?.[1].includes('isRenderProp')) {
    source = source.replace(/import\s+\{([^}]+)\}\s+from\s+['"]@videojs\/react['"]/, (_, names: string) => {
      const nameList = names
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const filtered = nameList.filter((n: string) => n !== 'isRenderProp');
      if (!filtered.some((n: string) => n.includes('RenderProp'))) {
        filtered.push('type RenderProp');
      }
      return `import { ${filtered.join(', ')} } from '@videojs/react'`;
    });

    // Ensure isValidElement is in the react import
    const reactCoreMatch = source.match(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/);
    if (reactCoreMatch && !reactCoreMatch[1].includes('isValidElement')) {
      source = source.replace(
        /import\s+\{([^}]+)\}\s+from\s+['"]react['"]/,
        (_, names: string) => `import { ${names.trim()}, isValidElement } from 'react'`
      );
    }

    utilities.push(
      "function isRenderProp(value: unknown): value is RenderProp<any> {\n  return typeof value === 'function' || isValidElement(value);\n}"
    );
  }

  return { source, utilities };
}

/** Find the byte offset just past the last import statement in the source. */
function findLastImportEnd(source: string): number {
  // Match both `import ... from '...'` and side-effect `import '...'`
  const importRegex = /^import\s+(?:.+from\s+)?['"][^'"]+['"];?\s*$/gm;
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(source)) !== null) {
    lastEnd = match.index + match[0].length + 1;
  }
  return lastEnd;
}

// ---------------------------------------------------------------------------
// React output cleanup
// ---------------------------------------------------------------------------

/**
 * Replace the BaseSkinProps / BaseVideoSkinProps type chain with a clean interface.
 * Removes intermediate type aliases and produces a flat exported interface.
 */
function resolvePropsInterface(source: string): string {
  const sourceFile = createSourceFile('props.tsx', source);
  const hasVideoProps = source.includes('BaseVideoSkinProps');

  const toRemove: Array<{ start: number; end: number }> = [];
  let mainPropsName: string | null = null;
  let mainPropsStart = -1;
  let mainPropsEnd = -1;
  let mainPropsExported = false;

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) continue;

    const name = getStatementName(statement);

    if (name === 'BaseSkinProps' || name === 'BaseVideoSkinProps') {
      toRemove.push({ start: statement.getFullStart(), end: statement.getEnd() });
    }

    if (name?.endsWith('SkinProps') && name !== 'BaseSkinProps' && name !== 'BaseVideoSkinProps') {
      mainPropsName = name;
      mainPropsStart = statement.getFullStart();
      mainPropsEnd = statement.getEnd();
      mainPropsExported = hasExportModifier(statement);
    }
  }

  if (!mainPropsName) return source;

  const exportKw = mainPropsExported ? 'export ' : '';
  const posterProp = hasVideoProps ? '\n  poster?: string | RenderProp<Poster.State> | undefined;' : '';
  const interfaceText = `${exportKw}interface ${mainPropsName} {\n  children?: ReactNode;\n  style?: CSSProperties;\n  className?: string;${posterProp}\n}`;

  const replacements = [
    ...toRemove.map((r) => ({ ...r, text: '' })),
    { start: mainPropsStart, end: mainPropsEnd, text: interfaceText },
  ].sort((a, b) => b.start - a.start);

  for (const r of replacements) {
    source = `${source.slice(0, r.start)}${r.text}${source.slice(r.end)}`;
  }

  // Remove PropsWithChildren from react import if no longer used in the body
  const bodyAfterImports = source.slice(findLastImportEnd(source));
  if (!bodyAfterImports.includes('PropsWithChildren')) {
    source = source.replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/, (_, names: string) => {
      const nameList = names
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const filtered = nameList.filter((n: string) => !n.includes('PropsWithChildren'));
      return `import { ${filtered.join(', ')} } from 'react'`;
    });
  }

  return source;
}

// ---------------------------------------------------------------------------
// React output reorganization
// ---------------------------------------------------------------------------

type SectionKey = 'top' | 'mainType' | 'main' | 'labels' | 'components' | 'errorDialog' | 'utilities' | 'icons';

const SECTION_HEADERS: Partial<Record<SectionKey, string>> = {
  mainType: 'Skin',
  labels: 'Labels',
  components: 'Components',
  errorDialog: 'Error Dialog',
  utilities: 'Utilities',
  icons: 'Icons',
};

function hasExportModifier(statement: ts.Statement): boolean {
  const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function classifyDeclaration(name: string, isExported: boolean): SectionKey {
  if (isExported && name.endsWith('Skin')) return 'main';
  if (isExported && name.endsWith('SkinProps')) return 'mainType';
  if (name === 'SEEK_TIME') return 'mainType';
  if (name.endsWith('Label')) return 'labels';
  if (name === 'ErrorDialog' || name === 'ErrorDialogClassNames' || name === 'ERROR_CLASSNAMES') return 'errorDialog';
  if (name.endsWith('Icon')) return 'icons';
  if (name.startsWith('is') && name[2] === name[2]?.toUpperCase()) return 'utilities';
  if (name === 'Button' || name.endsWith('Popover') || name.startsWith('Slider')) return 'components';
  return 'top';
}

function sectionHeader(title: string): string {
  return `// ================================================================\n// ${title}\n// ================================================================`;
}

/**
 * Reorganize the React skin output into well-defined sections.
 * Classifies each top-level declaration and reassembles with section headers.
 * Extra declarations (utilities, icon components) are appended to their sections.
 */
function reorganizeReactOutput(source: string, extraUtilities: string[], extraIconComponents: string[]): string {
  const sourceFile = createSourceFile('output.tsx', source);

  const imports: string[] = [];
  const sections: Record<SectionKey, string[]> = {
    top: [],
    mainType: [],
    main: [],
    labels: [],
    components: [],
    errorDialog: [],
    utilities: [],
    icons: [],
  };

  for (const statement of sourceFile.statements) {
    if (isDirectivePrologueStatement(statement)) continue;

    if (ts.isImportDeclaration(statement)) {
      imports.push(statement.getText(sourceFile));
      continue;
    }

    const name = getStatementName(statement);
    const exported = hasExportModifier(statement);
    const section = name ? classifyDeclaration(name, exported) : 'top';
    sections[section].push(statement.getText(sourceFile));
  }

  // Append extra declarations from transforms
  sections.utilities.push(...extraUtilities);
  sections.icons.push(...extraIconComponents);

  // Assemble output
  const sectionOrder: SectionKey[] = [
    'top',
    'mainType',
    'main',
    'labels',
    'components',
    'errorDialog',
    'utilities',
    'icons',
  ];

  const parts: string[] = [imports.join('\n')];

  for (const key of sectionOrder) {
    const declarations = sections[key];
    if (declarations.length === 0) continue;

    const header = SECTION_HEADERS[key];
    if (header) {
      parts.push(sectionHeader(header));
    }
    parts.push(declarations.join('\n\n'));
  }

  return `${parts.join('\n\n')}\n`;
}

/**
 * Flatten `ERROR_CLASSNAMES` into the inlined `ErrorDialog` component so the
 * ejected output has plain className strings instead of the classNames-prop
 * indirection.
 *
 * @temporary Remove once the ErrorDialog component no longer uses the
 *   `classNames` prop pattern. Tracked in https://github.com/videojs/v10/pull/1077.
 *   Cleanup: delete this function + its call in `processReactSkin` (step 9).
 */
function flattenErrorClasses(source: string): string {
  if (!source.includes('const ERROR_CLASSNAMES')) return source;

  // -- 1. Parse ERROR_CLASSNAMES const into a key → raw-expression map -------
  const blockMatch = source.match(/const ERROR_CLASSNAMES\s*=\s*\{([\s\S]*?)\};/);
  if (!blockMatch) return source;

  const classMap = new Map<string, string>();
  // Match `key: <value>,` handling multi-char expressions (property access,
  // array/filter/join chains, string literals, etc.)
  for (const [, key, value] of blockMatch[1].matchAll(/(\w+)\s*:\s*(.+?)\s*(?:,\s*$|,?\s*(?=\}))/gm)) {
    classMap.set(key, value);
  }

  // -- 2. Replace className={classNames?.X} with resolved values -------------
  for (const [key, value] of classMap) {
    const isStringLiteral = /^'[^']*'$/.test(value) || /^"[^"]*"$/.test(value);
    const replacement = isStringLiteral
      ? `className=${value.replace(/'/g, '"')}` // 'foo' → className="foo"
      : `className={${value}}`;
    source = source.replace(new RegExp(`className=\\{classNames\\?\\.${key}\\}`, 'g'), replacement);
  }

  // Any remaining classNames?.X refs (keys absent from ERROR_CLASSNAMES) → drop attr
  source = source.replace(/\s*className=\{classNames\?\.\w+\}/g, '');

  // -- 3. Remove ErrorDialogClassNames interface -----------------------------
  source = source.replace(/(?:export )?interface ErrorDialogClassNames\s*\{[\s\S]*?\}\n*/g, '');

  // -- 4. Remove ERROR_CLASSNAMES const --------------------------------------
  source = source.replace(/const ERROR_CLASSNAMES\s*=\s*\{[\s\S]*?\};\n*/g, '');

  // -- 5. Simplify ErrorDialog signature (drop classNames prop) --------------
  source = source.replace(
    /(?:export )?function ErrorDialog\(\{\s*classNames\s*\}\s*:\s*\{\s*classNames\?\s*:\s*ErrorDialogClassNames\s*\}\)/g,
    'function ErrorDialog()'
  );

  // -- 6. Simplify call site -------------------------------------------------
  source = source.replace(/<ErrorDialog\s+classNames=\{ERROR_CLASSNAMES\}\s*\/>/g, '<ErrorDialog />');

  return source;
}

/**
 * Move the destructured props from the skin function body into the function
 * argument so the signature reads e.g.:
 *   `function VideoSkin({ children, className, poster, ...rest }: VideoSkinProps)`
 */
function destructureSkinProps(source: string): string {
  return source.replace(
    /export function (\w+Skin\w*)\(props: (\w+Props)\): ReactNode \{\n\s*const \{ (.+?) \} = props;\n/,
    'export function $1({ $3 }: $2): ReactNode {\n'
  );
}

/**
 * Add a Player section to the ejected React output: imports for createPlayer,
 * Video/Audio, and features; an exported Player instance; a typed Props
 * interface; and an exported VideoPlayer/AudioPlayer component with @example.
 */
function addPlayerSection(source: string, mediaType: MediaType): string {
  // Find the exported skin function name
  const skinMatch = source.match(/export function (\w+Skin\w*)\(/);
  if (!skinMatch) return source;

  const skinName = skinMatch[1];
  const isVideo = mediaType === 'video';
  const mediaTag = isVideo ? 'Video' : 'Audio';
  const features = isVideo ? 'videoFeatures' : 'audioFeatures';
  const playerName = isVideo ? 'VideoPlayer' : 'AudioPlayer';
  const propsName = `${playerName}Props`;
  const subpath = isVideo ? 'video' : 'audio';
  const playsInline = isVideo ? ' playsInline' : '';

  // 1. Add createPlayer to the @videojs/react import
  source = source.replace(
    /import \{([^}]+)\} from '@videojs\/react';/,
    (m, names) => `import { createPlayer,${names}} from '@videojs/react';`
  );

  // 2. Add Video/Audio + features import and CSS import after the @videojs/react import line
  const mediaImport = `import { ${mediaTag}, ${features} } from '@videojs/react/${subpath}';`;
  const cssImport = `import './player.css';`;
  source = source.replace(/(import \{[^}]*\} from '@videojs\/react';)/, `$1\n${mediaImport}\n${cssImport}`);

  // 3. Insert Player section after imports (before everything else)
  const playerBlock = [
    sectionHeader('Player'),
    '',
    `export const Player = createPlayer({ features: ${features} });`,
    '',
    `export interface ${propsName} {`,
    '  src: string;',
    '}',
    '',
    '/**',
    ' * @example',
    ' * ```tsx',
    ` * <${playerName} src="${DEMO_VIDEO_SRC}" />`,
    ' * ```',
    ' */',
    `export function ${playerName}({ src }: ${propsName}) {`,
    '  return (',
    '    <Player.Provider>',
    `      <${skinName}>`,
    `        <${mediaTag} src={src}${playsInline} />`,
    `      </${skinName}>`,
    '    </Player.Provider>',
    '  );',
    '}',
  ].join('\n');

  // Find the end of the last import statement and insert after it
  const lastImportIdx = findLastImportEnd(source);
  const before = source.slice(0, lastImportIdx).trimEnd();
  const after = source.slice(lastImportIdx).trimStart();
  source = `${before}\n\n${playerBlock}\n\n${after}`;

  return source;
}

/**
 * Process a React skin: inline SVG icons, resolve all imports,
 * and produce both TSX and JSX versions.
 */
async function processReactSkin(skin: ReactSkinDef): Promise<{ tsx: string; jsx: string }> {
  const absPath = resolve(ROOT, skin.source);
  let source = readFileSync(absPath, 'utf-8');
  validatePackageImports(source, skin.source);
  const postImport: string[] = [];

  // 1. Inline relative imports recursively so the output is self-contained.
  source = inlineRelativeImports(source, absPath);

  // 2. Extract icon components (remove import, keep JSX calls, generate components)
  const icons = await inlineReactIcons(source);
  source = icons.source;

  // 3. Resolve @videojs/skins/* tokens (Tailwind skins only, private package)
  source = await inlineSkinTokens(source, postImport);

  // 4. Replace cn calls with template literals
  source = inlineCn(source);

  // 5. Consolidate @/ path aliases → @videojs/react
  source = rewritePathAliases(source);

  // 6. Inline private package imports (core/dom → react, predicates, isRenderProp)
  const privates = inlinePrivatePackages(source);
  source = privates.source;

  // 7. Insert collected non-import code after the final import statement
  if (postImport.length > 0) {
    const insertPos = findLastImportEnd(source);
    const block = `\n${postImport.join('\n\n')}\n`;
    source = `${source.slice(0, insertPos)}${block}${source.slice(insertPos)}`;
  }

  // 8. Replace Base*SkinProps chain with a clean interface
  source = resolvePropsInterface(source);

  // 9. Flatten ERROR_CLASSNAMES into ErrorDialog JSX (@temporary — remove with flattenErrorClasses)
  source = flattenErrorClasses(source);

  // 10. Reorganize into sections with comment headers
  let tsx = reorganizeReactOutput(source, privates.utilities, icons.iconComponents);

  // 11. Add Player section (createPlayer, imports, VideoPlayer/AudioPlayer component)
  tsx = addPlayerSection(tsx, getSkinMediaType(skin));

  // 12. Destructure skin props in function argument instead of body
  tsx = destructureSkinProps(tsx);

  const jsx = tsxToJsx(tsx);

  return { tsx, jsx };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log.info('Building ejected skins...\n');

  const entries: EjectedSkinEntry[] = [];

  for (const skin of SKINS) {
    log.info(`Processing: ${skin.id}`);

    const entry: EjectedSkinEntry = {
      id: skin.id,
      name: skin.name,
      platform: skin.platform,
      style: skin.style,
    };

    if (skin.platform === 'html') {
      entry.html = await processHtmlSkin(skin);
    } else {
      const { tsx, jsx } = await processReactSkin(skin);
      entry.tsx = tsx;
      entry.jsx = jsx;
    }

    if (skin.css) {
      entry.css = resolveCss(skin.css);
    }

    entries.push(entry);
  }

  // Write output
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(entries, null, 2)}\n`);

  log.info(`✅ Wrote ${entries.length} entries to ${OUTPUT}`);
}

main().catch((err) => {
  log.error(err);
  process.exit(1);
});
