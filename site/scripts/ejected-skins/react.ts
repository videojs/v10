/**
 * Build ejected skin snippets for copy-paste usage.
 *
 * Produces `site/src/content/ejected-skins.json` with:
 * - HTML skins: rendered HTML templates with <media-icon> elements and resolved classes
 * - React skins: TSX (with types) and JSX (types stripped) with public icon imports
 * - CSS variants include a `css` field with all @imports resolved
 * - Tailwind variants omit the `css` field (users bring their own Tailwind)
 *
 * Prerequisites: `pnpm build:packages` (at minimum html, react, icons, skins, utils).
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { resolveImports } from '../../../build/plugins/resolve-css-imports.ts';
import { normalizeImports } from '../normalize-imports.ts';
import { DEMO_POSTER_SRC, DEMO_VIDEO_SRC, getSkinMediaType, type MediaType, type ReactSkinDef } from './config.ts';
import { pkgDistUrl, toRepoPath, validatePackageImports } from './package-resolver.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const SKINS_SRC = resolve(ROOT, 'packages/skins/src');

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
    if (existsSync(candidate) && statSync(candidate).isFile()) {
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

function inlineRelativeImports(source: string, sourcePath: string, rewriteSource = (value: string) => value): string {
  source = rewriteSource(source);
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
    const targetSource = rewriteSource(readFileSync(targetPath, 'utf-8'));
    validatePackageImports(targetSource, toRepoPath(targetPath));
    const transformedTargetSource = inlineRelativeImports(targetSource, targetPath, rewriteSource);
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
// CSS resolution
// ---------------------------------------------------------------------------

export function resolveCss(cssPath: string): string {
  const abs = resolve(ROOT, cssPath);
  const raw = readFileSync(abs, 'utf-8');
  return resolveImports(raw, dirname(abs), SKINS_SRC);
}

// React skin processing - resolve imports, produce TSX + JSX.

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

/**
 * Rewrite package-private or local React icon imports to public package
 * re-exports for ejected skins.
 */
function rewriteReactIconImports(source: string): string {
  return source
    .replace(/from\s+['"]@videojs\/icons\/react(?:\/default)?['"]/g, "from '@videojs/react/icons'")
    .replace(/from\s+['"]@videojs\/icons\/react\/minimal['"]/g, "from '@videojs/react/icons/minimal'")
    .replace(/from\s+['"]@\/icons['"]/g, "from '@videojs/react/icons'")
    .replace(/from\s+['"]@\/icons\/minimal['"]/g, "from '@videojs/react/icons/minimal'")
    .replace(/from\s+['"]\.\.\/\.\.\/icons['"]/g, "from '@videojs/react/icons'")
    .replace(/from\s+['"]\.\.\/\.\.\/icons\/minimal['"]/g, "from '@videojs/react/icons/minimal'");
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
      "function isRenderProp(value: unknown): value is RenderProp<unknown> {\n  return typeof value === 'function' || isValidElement(value);\n}"
    );
  }

  return { source, utilities };
}

/** Find the index of the closing `)` that matches the `(` at `openIndex`. */
function findMatchingParen(source: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') depth--;
    if (depth === 0) return i;
  }
  return -1;
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

  return `'use client';\n\n${parts.join('\n\n')}\n`;
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
 * Flatten the skin into a Player component. Produces two files:
 *   - `player.ts`: owns the `createPlayer({ features })` call and exports `Player`.
 *   - `VideoPlayer.tsx` / `AudioPlayer.tsx`: imports `Player` from `./player` and
 *     owns the React component. Splitting these avoids React Fast Refresh bailing
 *     out (a file must export only components for Fast Refresh to apply edits).
 *
 * Also: merges SkinProps into PlayerProps (adding `src`), inlines the skin body
 * into VideoPlayer/AudioPlayer wrapped in `Player.Provider`, and removes the
 * separate Skin export.
 */
function flattenSkinIntoPlayer(source: string, mediaType: MediaType): { player: string; component: string } {
  const isVideo = mediaType === 'video';
  const mediaTag = isVideo ? 'Video' : 'Audio';
  const features = isVideo ? 'videoFeatures' : 'audioFeatures';
  const playerName = isVideo ? 'VideoPlayer' : 'AudioPlayer';
  const subpath = isVideo ? 'video' : 'audio';
  const playsInline = isVideo ? ' playsInline' : '';

  const player = [
    `import { createPlayer } from '@videojs/react';`,
    `import { ${features} } from '@videojs/react/${subpath}';`,
    '',
    `export const Player = createPlayer({ features: ${features} });`,
    '',
  ].join('\n');

  // 1. Add Video/Audio import, CSS import, and Player import from ./player
  const mediaImport = `import { ${mediaTag} } from '@videojs/react/${subpath}';`;
  const cssImport = "import './player.css';";
  const playerImport = "import { Player } from './player';";
  source = source.replace(
    /(import \{[^}]*\} from '@videojs\/react';)/,
    `$1\n${mediaImport}\n${cssImport}\n${playerImport}`
  );

  // 2. Rename SkinProps → PlayerProps, replace `children` with `src`
  source = source.replace(/export interface \w+SkinProps/, `export interface ${playerName}Props`);
  source = source.replace(/(\s*)children\?: ReactNode;/, `$1src: string;`);

  // 3. Replace the skin function: rename, swap children→src, wrap in Player.Provider
  //    Match the destructured form: function XSkin({ children, className, poster, ...rest }: XSkinProps): ReactNode {
  source = source.replace(
    /export function \w+Skin\(\{ children, ([^}]+)\}: \w+SkinProps\): ReactNode \{\n([\s\S]*?)\n\}/,
    (_, destructuredRest: string, body: string) => {
      // Replace {children} with <Video/Audio> element inside the body
      let newBody = body.replace(/^\n+/, '').replace(/(\s*)\{children\}/, `$1<${mediaTag} src={src}${playsInline} />`);

      // Wrap the return body in <Player.Provider>, re-indenting everything
      // inside `return (...)` by 2 extra spaces for the new wrapper.
      const returnIdx = newBody.indexOf('return (');
      if (returnIdx !== -1) {
        const parenStart = newBody.indexOf('(', returnIdx);
        const parenEnd = findMatchingParen(newBody, parenStart);
        const inner = newBody.slice(parenStart + 1, parenEnd).replace(/^\n+|\n+$/g, '');
        const reindented = inner
          .split('\n')
          .map((line) => (line.trim() === '' ? '' : `  ${line}`))
          .join('\n');
        newBody = `${newBody.slice(0, returnIdx)}return (\n    <Player.Provider>\n${reindented}\n    </Player.Provider>\n  )${newBody.slice(parenEnd + 1)}`;
      }

      const hasPoster = destructuredRest.includes('poster');
      const posterExample = hasPoster ? `\n *   poster="${DEMO_POSTER_SRC}"` : '';

      // @example JSDoc and the function signature
      const header = [
        '/**',
        ' * @example',
        ' * ```tsx',
        ` * <${playerName}`,
        ` *   src="${DEMO_VIDEO_SRC}"${posterExample}`,
        ' * />',
        ' * ```',
        ' */',
        `export function ${playerName}({ src, ${destructuredRest}}: ${playerName}Props): ReactNode {`,
      ].join('\n');

      return `${header}\n${newBody}\n}`;
    }
  );

  // 4. Remove the "Skin" section header (it's now part of "Player")
  source = source.replace(/\/\/ =+\n\/\/ Skin\n\/\/ =+\n\n/, `${sectionHeader('Player')}\n\n`);

  return { player, component: source };
}

/**
 * Process a React skin: rewrite icon imports, resolve imports,
 * and produce both TSX and JSX versions.
 */
export async function processReactSkin(
  skin: ReactSkinDef
): Promise<{ tsx: Record<string, string>; jsx: Record<string, string> }> {
  const absPath = resolve(ROOT, skin.source);
  let source = readFileSync(absPath, 'utf-8');
  source = rewriteReactIconImports(source);
  validatePackageImports(source, skin.source);
  const postImport: string[] = [];

  // 1. Inline relative imports recursively so the output is self-contained.
  source = inlineRelativeImports(source, absPath, rewriteReactIconImports);

  // 2. Resolve @videojs/skins/* tokens (Tailwind skins only, private package)
  source = await inlineSkinTokens(source, postImport);

  // 3. Replace cn calls with template literals
  source = inlineCn(source);

  // 4. Consolidate @/ path aliases → @videojs/react
  source = rewritePathAliases(source);

  // 5. Inline private package imports (core/dom → react, predicates, isRenderProp)
  const privates = inlinePrivatePackages(source);
  source = privates.source;

  // 6. Insert collected non-import code after the final import statement
  if (postImport.length > 0) {
    const insertPos = findLastImportEnd(source);
    const block = `\n${postImport.join('\n\n')}\n`;
    source = `${source.slice(0, insertPos)}${block}${source.slice(insertPos)}`;
  }

  // 7. Replace Base*SkinProps chain with a clean interface
  source = resolvePropsInterface(source);

  // 8. Flatten ERROR_CLASSNAMES into ErrorDialog JSX (@temporary — remove with flattenErrorClasses)
  source = flattenErrorClasses(source);

  // 9. Reorganize into sections with comment headers
  let tsx = reorganizeReactOutput(source, privates.utilities, []);

  // 10. Destructure skin props in function argument instead of body
  tsx = destructureSkinProps(tsx);

  // 11. Flatten skin into player (split into player.ts + Player.tsx, wrap in Player.Provider)
  const mediaType = getSkinMediaType(skin);
  const { player, component } = flattenSkinIntoPlayer(tsx, mediaType);
  const componentFile = mediaType === 'video' ? 'VideoPlayer' : 'AudioPlayer';

  return {
    tsx: {
      'player.ts': player,
      [`${componentFile}.tsx`]: component,
    },
    jsx: {
      'player.js': tsxToJsx(player),
      [`${componentFile}.jsx`]: tsxToJsx(component),
    },
  };
}
