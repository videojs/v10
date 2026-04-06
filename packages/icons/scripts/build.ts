import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, watch, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const isWatch = process.argv.includes('--watch');

import { transform } from '@svgr/core';
import { camelCase, pascalCase } from '@videojs/utils/string';
import { transform as esbuildTransform } from 'esbuild';
import { type Config, optimize } from 'svgo';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS_DIR = join(ROOT, 'src/assets');
const DIST_DIR = join(ROOT, 'dist');

const FRAMEWORKS = ['react', 'html'] as const;

const SVGO_CONFIG: Config = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          convertColors: {
            currentColor: /^black$/,
          },
        },
      },
    },
    {
      name: 'removeAttrs',
      params: {
        attrs: ['^clip-rule$', '^fill-rule$'],
      },
    },
    {
      name: 'addAttributesToSVGElement',
      params: {
        attributes: [{ 'aria-hidden': 'true' }],
      },
    },
  ],
};

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function cleanDist(): void {
  if (existsSync(DIST_DIR)) rmSync(DIST_DIR, { recursive: true, force: true });
}

function getIconSets(): string[] {
  if (!existsSync(ASSETS_DIR)) {
    console.error(`Assets directory not found: ${ASSETS_DIR}`);
    process.exit(1);
  }
  return readdirSync(ASSETS_DIR).filter((item) => !item.startsWith('.') && item !== 'index');
}

function getSvgFiles(setName: string): string[] {
  return readdirSync(join(ASSETS_DIR, setName)).filter((f) => f.endsWith('.svg'));
}

function optimizeSvg(svgContent: string): string {
  const optimized = optimize(svgContent, SVGO_CONFIG).data;
  return optimized
    .replaceAll('fill="black"', 'fill="currentColor"')
    .replaceAll('stroke="black"', 'stroke="currentColor"');
}

async function buildReactComponent(svgContent: string, componentName: string): Promise<{ js: string; tsx: string }> {
  const transformOpts: Parameters<typeof transform>[1] = {
    plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
    jsxRuntime: 'automatic',
    svgoConfig: SVGO_CONFIG,
  };

  const tsxCode = await transform(svgContent, { ...transformOpts, typescript: true }, { componentName });
  const jsxCode = await transform(svgContent, transformOpts, { componentName });

  // SVGR outputs JSX syntax which is invalid in .js files — compile to JS
  const { code } = await esbuildTransform(jsxCode, { loader: 'jsx', jsx: 'automatic' });

  return { js: code, tsx: tsxCode };
}

function buildHtmlExport(svgContent: string, varName: string): string {
  return `export const ${varName} = \`${optimizeSvg(svgContent)}\`;\n`;
}

function buildRenderModule(icons: { name: string; content: string }[]): string {
  const entries = icons.map(({ name, content }) => `  "${name}": \`${optimizeSvg(content)}\``).join(',\n');
  return [
    `const icons = {\n${entries},\n};`,
    ``,
    `export function renderIcon(name, attrs) {`,
    `  const svg = icons[name];`,
    `  if (!svg) return '';`,
    `  if (!attrs) return svg;`,
    `  const attrStr = Object.entries(attrs)`,
    `    .map(([k, v]) => \` \${k}="\${v}"\`)`,
    `    .join('');`,
    `  return svg.replace('<svg', \`<svg\${attrStr}\`);`,
    `}`,
    ``,
  ].join('\n');
}

function buildRenderTypes(iconNames: string[]): string {
  const union = iconNames.map((name) => `'${name}'`).join(' | ');
  return [
    `export type IconName = ${union};`,
    ``,
    `export declare function renderIcon(`,
    `  name: IconName,`,
    `  attrs?: Record<string, string>,`,
    `): string;`,
    ``,
  ].join('\n');
}

function buildIconMap(icons: { name: string; content: string }[]): string {
  const entries = icons.map(({ name, content }) => `  "${name}": \`${optimizeSvg(content)}\``).join(',\n');
  return `export const icons = {\n${entries},\n};\n`;
}

function buildElementIndex(sets: string[]): string {
  const varName = (set: string) => `${camelCase(set)}Icons`;
  const imports = sets.map((set) => `import { icons as ${varName(set)} } from './${set}/icons.js';`).join('\n');
  const registers = sets.map((set) => `MediaIconElement.register('${set}', ${varName(set)});`).join('\n');

  return [
    `import { MediaIconElement } from './base.js';`,
    imports,
    ``,
    `if (!customElements.get('media-icon')) {`,
    `  customElements.define('media-icon', MediaIconElement);`,
    `}`,
    ``,
    registers,
    ``,
  ].join('\n');
}

function buildElementBase(): string {
  return [
    `export class MediaIconElement extends HTMLElement {`,
    `  static #families = new Map();`,
    ``,
    `  static register(family, icons) {`,
    `    const map = MediaIconElement.#families.get(family) ?? new Map();`,
    `    for (const [name, svg] of Object.entries(icons)) {`,
    `      map.set(name, svg);`,
    `    }`,
    `    MediaIconElement.#families.set(family, map);`,
    `  }`,
    ``,
    `  static get observedAttributes() {`,
    `    return ['name', 'family'];`,
    `  }`,
    ``,
    `  attributeChangedCallback() {`,
    `    this.#render();`,
    `  }`,
    ``,
    `  connectedCallback() {`,
    `    this.#render();`,
    `  }`,
    ``,
    `  #render() {`,
    `    const name = this.getAttribute('name');`,
    `    if (!name) return;`,
    ``,
    `    const family = this.getAttribute('family') || 'default';`,
    `    const icons = MediaIconElement.#families.get(family);`,
    `    const svg = icons?.get(name);`,
    `    if (!svg) return;`,
    ``,
    `    this.innerHTML = svg;`,
    `  }`,
    `}`,
    ``,
  ].join('\n');
}

function buildElementBaseTypes(): string {
  return [
    `export type IconMap = Record<string, string>;`,
    ``,
    `export declare class MediaIconElement extends HTMLElement {`,
    `  static register(family: string, icons: IconMap): void;`,
    `  connectedCallback(): void;`,
    `  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;`,
    `}`,
    ``,
    `declare global {`,
    `  interface HTMLElementTagNameMap {`,
    `    'media-icon': MediaIconElement;`,
    `  }`,
    `}`,
    ``,
  ].join('\n');
}

function buildIndexExports(icons: { name: string; varName: string }[], framework: 'react' | 'html'): string {
  return icons
    .map(({ name, varName }) => {
      if (framework === 'react') {
        return `export { default as ${pascalCase(varName)}Icon } from './${name}.js';`;
      }

      return `export { ${camelCase(varName)}Icon } from './${name}.js';`;
    })
    .join('\n');
}

function buildIndexTypes(icons: { name: string; varName: string }[], framework: 'react' | 'html'): string {
  const types = icons.map(({ varName }) =>
    framework === 'react'
      ? `export declare const ${pascalCase(varName)}Icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>;`
      : `export declare const ${camelCase(varName)}Icon: string;`
  );
  return `/// <reference types="react" />\n${types.join('\n')}\n`;
}

function ensureElementBase(): void {
  const baseDir = join(DIST_DIR, 'element');
  ensureDir(baseDir);

  const basePath = join(baseDir, 'base.js');
  if (!existsSync(basePath)) {
    writeFileSync(basePath, buildElementBase());
    writeFileSync(join(baseDir, 'base.d.ts'), buildElementBaseTypes());
  }
}

async function buildIconSet(setName: string): Promise<void> {
  const svgFiles = getSvgFiles(setName);
  console.log(`Building set: ${setName} (${svgFiles.length} icons)`);

  const icons = svgFiles.map((file) => ({
    name: file.replace('.svg', ''),
    varName: file.replace('.svg', ''),
    content: readFileSync(join(ASSETS_DIR, setName, file), 'utf8'),
  }));

  // Build react and html per-icon modules
  for (const framework of FRAMEWORKS) {
    const outDir = join(DIST_DIR, framework, setName);
    ensureDir(outDir);

    for (const icon of icons) {
      const { name, varName, content } = icon;

      if (framework === 'react') {
        const componentName = `${pascalCase(varName)}Icon`;
        const { js, tsx } = await buildReactComponent(content, componentName);
        writeFileSync(join(outDir, `${name}.js`), js);
        writeFileSync(join(outDir, `${name}.tsx`), tsx);
        writeFileSync(
          join(outDir, `${name}.d.ts`),
          `import * as React from 'react';\ndeclare const ${componentName}: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>;\nexport default ${componentName};\n`
        );
      } else {
        const varNameCamel = camelCase(varName);
        writeFileSync(join(outDir, `${name}.js`), buildHtmlExport(content, `${varNameCamel}Icon`));
        writeFileSync(join(outDir, `${name}.d.ts`), `export declare const ${varNameCamel}Icon: string;\n`);
      }
    }

    writeFileSync(join(outDir, 'index.js'), buildIndexExports(icons, framework));
    writeFileSync(join(outDir, 'index.d.ts'), buildIndexTypes(icons, framework));
  }

  // Build render module
  const renderDir = join(DIST_DIR, 'render', setName);
  ensureDir(renderDir);
  writeFileSync(join(renderDir, 'index.js'), buildRenderModule(icons));
  writeFileSync(join(renderDir, 'index.d.ts'), buildRenderTypes(icons.map((i) => i.name)));

  // Build element: icon map per family (no per-set index)
  ensureElementBase();
  const elementDir = join(DIST_DIR, 'element', setName);
  ensureDir(elementDir);

  writeFileSync(join(elementDir, 'icons.js'), buildIconMap(icons));
  writeFileSync(join(elementDir, 'icons.d.ts'), `export declare const icons: Record<string, string>;\n`);
}

async function build(): Promise<void> {
  const sets = getIconSets();
  console.log(`Found ${sets.length} icon sets: ${sets.join(', ')}\n`);

  for (const set of sets) {
    await buildIconSet(set);
  }

  // Build unified element index that registers all families
  const elementDir = join(DIST_DIR, 'element');
  writeFileSync(join(elementDir, 'index.js'), buildElementIndex(sets));
  writeFileSync(join(elementDir, 'index.d.ts'), `export {};\n`);
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

async function main(): Promise<void> {
  if (isWatch) {
    console.log('Watching icons for changes...\n');

    const rebuild = debounce(() => {
      console.log('\nRebuilding icons...\n');
      build()
        .then(() => console.log('\nRebuild complete!'))
        .catch(console.error);
    }, 200);

    watch(ASSETS_DIR, { recursive: true }, (_event, filename) => {
      if (filename?.endsWith('.svg')) {
        console.log(`Changed: ${filename}`);
        rebuild();
      }
    });
  } else {
    console.log('Building icons...\n');
    cleanDist();
    await build();
    console.log('\nBuild complete!');
  }
}

main().catch(console.error);
