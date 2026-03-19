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

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { resolveImports } from '../../build/plugins/resolve-css-imports.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const PREFIX = '\x1b[35m[ejected-skins]\x1b[0m';
const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, '\x1b[33mwarn:\x1b[0m', ...args),
  error: (...args: unknown[]) => console.error(PREFIX, '\x1b[31merror:\x1b[0m', ...args),
};

/** Resolve a `@videojs/*` package specifier to its built dist file URL. */
function pkgDistUrl(specifier: string): string {
  const mapping: Record<string, string> = {
    '@videojs/icons/render/default': 'packages/icons/dist/render/default/index.js',
    '@videojs/icons/render/minimal': 'packages/icons/dist/render/minimal/index.js',
    '@videojs/utils/style': 'packages/utils/dist/style.js',
    '@videojs/skins/default/tailwind/video.tailwind': 'packages/skins/dist/default/default/tailwind/video.tailwind.js',
    '@videojs/skins/default/tailwind/audio.tailwind': 'packages/skins/dist/default/default/tailwind/audio.tailwind.js',
    '@videojs/skins/minimal/tailwind/video.tailwind': 'packages/skins/dist/default/minimal/tailwind/video.tailwind.js',
    '@videojs/skins/minimal/tailwind/audio.tailwind': 'packages/skins/dist/default/minimal/tailwind/audio.tailwind.js',
  };

  const rel = mapping[specifier];
  if (!rel) throw new Error(`No dist mapping for: ${specifier}`);
  return pathToFileURL(resolve(ROOT, rel)).href;
}
const SKINS_SRC = resolve(ROOT, 'packages/skins/src');
const OUTPUT = resolve(ROOT, 'site/src/content/ejected-skins.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

  return evaluateTemplate(templateBody, context);
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
  const iconImportMatch = source.match(/from\s+['"]@videojs\/icons\/react(?:\/(default|minimal))?['"]/);
  if (!iconImportMatch) return source;

  const iconSet = (iconImportMatch[1] || 'default') as 'default' | 'minimal';
  const iconImportBlock = source.match(/import\s+\{([\s\S]*?)\}\s+from\s+['"]@videojs\/icons\/react(?:\/\w+)?['"]/);
  const iconNames =
    iconImportBlock?.[1]
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) || [];

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

  source = source.replace(/import\s+\{[\s\S]*?\}\s+from\s+['"]@videojs\/icons\/react(?:\/\w+)?['"];?\n?/g, '');
  return source;
}

/**
 * Inline the ErrorDialog component from ./error-dialog.
 * Removes the import, adds ErrorDialog deps to existing imports,
 * and pushes the component code into postImport.
 */
function inlineErrorDialog(source: string, postImport: string[]): string {
  if (!source.includes("from './error-dialog'")) return source;

  const errorDialogPath = resolve(ROOT, 'packages/react/src/presets/video/error-dialog.tsx');
  const errorDialogSource = readFileSync(errorDialogPath, 'utf-8');
  const codeStart = errorDialogSource.indexOf('export interface');
  postImport.push(errorDialogSource.slice(codeStart));

  // Remove the ./error-dialog import
  source = source.replace(/import\s+\{\s*ErrorDialog\s*\}\s+from\s+['"]\.\/error-dialog['"];?\n?/g, '');

  // Add ErrorDialog's deps as imports
  if (!source.includes('selectError')) {
    source = `import { selectError } from '@videojs/core/dom';\n${source}`;
  }
  if (!source.includes('AlertDialog')) {
    source = `import { AlertDialog } from '@/ui/alert-dialog';\n${source}`;
  }
  if (!source.includes('useRef')) {
    source = source.replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/, (m, names: string) =>
      m.replace(names, `${names.trim()}, useRef`)
    );
  }

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
 * Replace relative type imports with inline type definitions.
 * - `../types` → remove import, resolve `BaseSkinProps` usage in-place
 * - `./skin` / `./minimal-skin` → remove import, add type to postImport
 */
function inlineRelativeTypes(source: string, postImport: string[]): string {
  const baseSkinPropsType = 'PropsWithChildren<{ style?: CSSProperties; className?: string }>';

  // Remove `import type { BaseSkinProps } from '../types'`
  source = source.replace(/import\s+type\s+\{\s*BaseSkinProps\s*\}\s+from\s+['"]\.\.\/types['"];?\n?/g, '');
  // Resolve `export type XxxProps = BaseSkinProps` in-place (already after imports)
  source = source.replace(
    /export\s+type\s+(\w+)\s*=\s*BaseSkinProps\s*;/g,
    (_, name: string) => `export type ${name} = ${baseSkinPropsType};`
  );

  // Replace `import type { XxxProps } from './skin'` or './minimal-skin'
  source = source.replace(
    /import\s+type\s+\{\s*(\w+)\s*\}\s+from\s+['"]\.\/(?:minimal-)?skin['"];?\n?/g,
    (_, typeName: string) => {
      postImport.push(`type ${typeName} = ${baseSkinPropsType};`);
      return '';
    }
  );

  // Ensure PropsWithChildren and CSSProperties are in the react import
  if (source.includes('PropsWithChildren') || postImport.some((c) => c.includes('PropsWithChildren'))) {
    const reactImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]react['"]/;
    const reactMatch = source.match(reactImportRegex);
    if (reactMatch) {
      let names = reactMatch[1];
      if (!names.includes('PropsWithChildren')) {
        names = `${names.trim()}, type PropsWithChildren`;
      }
      if (!names.includes('CSSProperties')) {
        names = `${names.trim()}, type CSSProperties`;
      }
      source = source.replace(reactMatch[0], `import { ${names} } from 'react'`);
    }
  }

  return source;
}

/**
 * Consolidate `@/` path alias imports into `@videojs/react`.
 * All UI components and hooks are re-exported from the main package entry.
 */
function rewritePathAliases(source: string): string {
  const aliasRegex = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]@\/[^'"]+['"];?\n?/g;
  const valueNames: string[] = [];
  const typeNames: string[] = [];
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
        typeNames.push(name.replace(/^type\s+/, ''));
      } else {
        valueNames.push(name);
      }
    }
  }

  if (matches.length === 0) return source;

  for (const m of matches) {
    source = source.replace(m, '');
  }

  const allNames = [...valueNames, ...typeNames.map((n) => `type ${n}`)];
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
  const postImport: string[] = [];

  // 1. Inline SVG icons (replace icon components with <svg> markup)
  source = await inlineReactIcons(source);

  // 2. Inline ErrorDialog component (video skins only)
  source = inlineErrorDialog(source, postImport);

  // 3. Resolve @videojs/skins/* tokens (Tailwind skins only, private package)
  source = await inlineSkinTokens(source, postImport);

  // 4. Replace cn calls with template literals
  source = inlineCn(source);

  // 5. Inline relative type imports (../types, ./skin, ./minimal-skin)
  source = inlineRelativeTypes(source, postImport);

  // 6. Consolidate @/ path aliases → @videojs/react
  source = rewritePathAliases(source);

  // 7. Insert collected non-import code after the final import statement
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
