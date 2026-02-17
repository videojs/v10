import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from '@svgr/core';
import { camelCase, pascalCase } from '@videojs/utils/string';
import { transform as esbuildTransform } from 'esbuild';
import { optimize } from 'svgo';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS_DIR = join(ROOT, 'src/assets');
const DIST_DIR = join(ROOT, 'dist');

const FRAMEWORKS = ['react', 'html'] as const;
type Framework = (typeof FRAMEWORKS)[number];

const SVGO_CONFIG = {
  multipass: true,
  plugins: [],
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
  return optimize(svgContent, SVGO_CONFIG).data;
}

async function buildReactComponent(svgContent: string, componentName: string): Promise<{ js: string; tsx: string }> {
  const transformOpts = {
    plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
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

function buildIndexExports(icons: { name: string; varName: string }[], framework: Framework): string {
  return icons
    .map(({ name, varName }) =>
      framework === 'react'
        ? `export { default as ${pascalCase(varName)}Icon } from './${name}.js';`
        : `export { ${camelCase(varName)}Icon } from './${name}.js';`
    )
    .join('\n');
}

function buildIndexTypes(icons: { name: string; varName: string }[], framework: Framework): string {
  const types = icons.map(({ varName }) =>
    framework === 'react'
      ? `export declare const ${pascalCase(varName)}Icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>;`
      : `export declare const ${camelCase(varName)}Icon: string;`
  );
  return `/// <reference types="react" />\n${types.join('\n')}\n`;
}

async function buildIconSet(setName: string): Promise<void> {
  const svgFiles = getSvgFiles(setName);
  console.log(`  Building set: ${setName} (${svgFiles.length} icons)`);

  const icons = svgFiles.map((file) => ({
    name: file.replace('.svg', ''),
    varName: file.replace('.svg', ''),
    content: readFileSync(join(ASSETS_DIR, setName, file), 'utf8'),
  }));

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
}

async function main(): Promise<void> {
  console.log('Building icons...\n');
  cleanDist();

  const sets = getIconSets();
  console.log(`Found ${sets.length} icon sets: ${sets.join(', ')}\n`);

  for (const set of sets) {
    await buildIconSet(set);
  }

  console.log('\nBuild complete!');
}

main().catch(console.error);
