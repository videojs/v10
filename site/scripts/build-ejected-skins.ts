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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

function getNamedExportText(sourceFile: ts.SourceFile, exportName: string): string | null {
  for (const statement of sourceFile.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    const isExported = modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;

    if (
      isExported &&
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name?.text === exportName
    ) {
      return stripExportModifier(statement.getText(sourceFile));
    }

    if (isExported && ts.isVariableStatement(statement)) {
      const names = statement.declarationList.declarations
        .map((declaration) => (ts.isIdentifier(declaration.name) ? declaration.name.text : null))
        .filter(Boolean);

      if (names.includes(exportName)) {
        return stripExportModifier(statement.getText(sourceFile));
      }
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

function findLocalDeclarationText(sourceFile: ts.SourceFile, localName: string): string | null {
  for (const statement of sourceFile.statements) {
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name?.text === localName
    ) {
      return statement.getText(sourceFile);
    }

    if (ts.isVariableStatement(statement)) {
      const names = statement.declarationList.declarations
        .map((declaration) => (ts.isIdentifier(declaration.name) ? declaration.name.text : null))
        .filter(Boolean);

      if (names.includes(localName)) {
        return statement.getText(sourceFile);
      }
    }
  }

  return null;
}

function getLocalDeclarationTexts(sourceFile: ts.SourceFile): Map<string, string> {
  const declarations = new Map<string, string>();

  for (const statement of sourceFile.statements) {
    const text = ts.isExportDeclaration(statement)
      ? null
      : ts.canHaveModifiers(statement)
        ? stripExportModifier(statement.getText(sourceFile))
        : statement.getText(sourceFile);

    if (
      text &&
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      declarations.set(statement.name.text, text);
    }

    if (text && ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          declarations.set(declaration.name.text, stripExportModifier(statement.getText(sourceFile)));
        }
      }
    }
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

    const names = namedImports.get(specifier) ?? new Set<string>();
    if (importClause.isTypeOnly && ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        names.add(`type ${element.getText(sourceFile)}`);
      }
    } else if (ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        names.add(element.getText(sourceFile));
      }
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

  return `${scriptTag}\n\n${html}`;
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

  // Clean up whitespace: normalize indentation and trim
  return html
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
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

  const html = evaluateTemplate(templateBody, context);

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
  const knownIcons = [
    'play',
    'pause',
    'restart',
    'seek',
    'spinner',
    'volume-high',
    'volume-low',
    'volume-off',
    'captions-off',
    'captions-on',
    'fullscreen-enter',
    'fullscreen-exit',
    'pip-enter',
    'pip-exit',
  ];
  const map: Record<string, string> = {};
  for (const name of knownIcons) {
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

/** Replace all `cn(...)` calls with `[...].filter(Boolean).join(' ')`. */
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

    parts.push(`[${args.join(', ')}].filter(Boolean).join(' ')`);
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

/** Replace icon component JSX with inline SVGs and remove icon imports. */
async function inlineReactIcons(source: string): Promise<string> {
  const sourceFile = createSourceFile('react-skin.tsx', source);
  const iconImport = sourceFile.statements.find((statement) => {
    if (!ts.isImportDeclaration(statement)) {
      return false;
    }

    const specifier = statement.moduleSpecifier.getText(sourceFile).slice(1, -1);
    return /^@videojs\/icons\/react(?:\/(default|minimal))?$/.test(specifier);
  });

  if (!iconImport || !ts.isImportDeclaration(iconImport)) {
    return source;
  }

  const iconSpecifier = iconImport.moduleSpecifier.getText(sourceFile).slice(1, -1);
  const iconSetMatch = iconSpecifier.match(/@videojs\/icons\/react(?:\/(default|minimal))?/);
  const iconSet = (iconSetMatch?.[1] || 'default') as 'default' | 'minimal';
  const namedBindings = iconImport.importClause?.namedBindings;
  const iconNames =
    namedBindings && ts.isNamedImports(namedBindings) ? namedBindings.elements.map((element) => element.name.text) : [];

  const iconsMap = await loadIconsMap(iconSet);

  for (const componentName of iconNames) {
    const iconName = componentToIconName(componentName);
    const rawSvg = iconsMap[iconName];
    if (!rawSvg) {
      log.warn(`No SVG found for ${componentName} (icon: ${iconName})`);
      continue;
    }
    const jsxSvg = svgToJsx(rawSvg);
    const regex = new RegExp(`<${componentName}\\s+className=((?:"[^"]*")|(?:\\{[^}]+\\}))\\s*/>`, 'g');
    source = source.replace(regex, (_, classNameAttr: string) => {
      return jsxSvg.replace('<svg', `<svg className=${classNameAttr}`);
    });
  }

  source = `${source.slice(0, iconImport.getFullStart())}${source.slice(iconImport.getEnd())}`;
  return source;
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

/** Find the byte offset just past the last import statement in the source. */
function findLastImportEnd(source: string): number {
  const importRegex = /^import\s+.+from\s+['"][^'"]+['"];?\s*$/gm;
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(source)) !== null) {
    lastEnd = match.index + match[0].length + 1;
  }
  return lastEnd;
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

  // 2. Inline SVG icons (replace icon components with <svg> markup)
  source = await inlineReactIcons(source);

  // 3. Resolve @videojs/skins/* tokens (Tailwind skins only, private package)
  source = await inlineSkinTokens(source, postImport);

  // 4. Replace cn calls with template literals
  source = inlineCn(source);

  // 5. Consolidate @/ path aliases → @videojs/react
  source = rewritePathAliases(source);

  // 6. Insert collected non-import code after the final import statement
  if (postImport.length > 0) {
    const insertPos = findLastImportEnd(source);
    const block = `\n${postImport.join('\n\n')}\n`;
    source = `${source.slice(0, insertPos)}${block}${source.slice(insertPos)}`;
  }

  const tsx = source;
  const jsx = tsxToJsx(source);

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
