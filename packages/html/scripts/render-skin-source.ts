import { readFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { runInNewContext } from 'node:vm';
import { compile } from '@videojs/compiler';
import { createStyleProgram, loadDesignSystem, type StyleProgram } from '@videojs/compiler/tailwind';
import { build, type Plugin } from 'esbuild';
import { createHtmlSkinSourceConfig, type SkinSourceStyle } from '../skins.compiler.config.ts';

export interface RenderSkinSourceOptions {
  style?: SkinSourceStyle | undefined;
  tailwindInput?: string | undefined;
}

export interface RenderedSkinSource {
  html: string;
  css: string;
}

/** Render one canonical Skin artifact entry to static light-DOM HTML. */
export async function renderSkinSource(entryFile: string, options: RenderSkinSourceOptions = {}): Promise<string> {
  return (await renderSkinSourceOutput(entryFile, options)).html;
}

export async function renderSkinSourceOutput(
  entryFile: string,
  options: RenderSkinSourceOptions = {}
): Promise<RenderedSkinSource> {
  const style = options.style ?? 'tailwind';
  const styleProgram =
    style === 'css'
      ? createStyleProgram({
          design: await loadDesignSystem(requiredTailwindInput(options.tailwindInput)),
          output: 'styles.css',
          themeSelector: '.media-skin',
        })
      : undefined;
  const result = await build({
    entryPoints: [entryFile],
    bundle: true,
    format: 'cjs',
    platform: 'neutral',
    write: false,
    jsx: 'automatic',
    jsxImportSource: 'source-ui-html',
    plugins: [canonicalHtmlPlugin({ ...options, style }, styleProgram)],
  });
  const code = result.outputFiles[0]?.text;
  if (!code) throw new Error(`HTML source rendering produced no output for \`${entryFile}\`.`);

  const module = { exports: {} as Record<string, unknown> };
  runInNewContext(code, { module, exports: module.exports });
  const render = selectSkinRender(module.exports, entryFile);

  const emittedStyles = styleProgram ? await styleProgram.emit() : { files: [] };
  if (emittedStyles.files.length > 1) {
    throw new Error('HTML source rendering expects one merged CSS output file.');
  }

  return {
    html: String(render({})).trim(),
    css: emittedStyles.files[0]?.source ?? '',
  };
}

function selectSkinRender(
  exports: Readonly<Record<string, unknown>>,
  entryFile: string
): (props: Record<string, never>) => unknown {
  if (typeof exports.default === 'function') {
    return exports.default as (props: Record<string, never>) => unknown;
  }

  const conventionalName = basename(entryFile)
    .replace(/\.skin\.[^.]+$/, '')
    .replace(/(^|-)(\w)/g, (_, _dash, letter) => letter.toUpperCase());
  const conventional = Object.entries(exports).filter(
    ([name, value]) => typeof value === 'function' && (name === conventionalName || name.endsWith(conventionalName))
  );
  if (conventional.length === 1) {
    return conventional[0]![1] as (props: Record<string, never>) => unknown;
  }

  const functions = Object.entries(exports).filter(
    (entry): entry is [string, (props: Record<string, never>) => unknown] => typeof entry[1] === 'function'
  );
  if (functions.length === 1) return functions[0]![1];

  const available = functions.map(([name]) => name).join(', ') || '(none)';
  throw new Error(
    `HTML source rendering could not select the Skin component export in \`${entryFile}\`. ` +
      `Export it as default or with a name ending in \`${conventionalName}\`. Function exports: ${available}.`
  );
}

function canonicalHtmlPlugin(options: RenderSkinSourceOptions, styleProgram: StyleProgram | undefined): Plugin {
  return {
    name: 'videojs-source-html',
    setup(build) {
      build.onResolve({ filter: /^source-ui-html\/jsx-runtime$/ }, () => ({
        path: 'jsx-runtime',
        namespace: 'videojs-source-html',
      }));
      build.onResolve({ filter: /^@videojs\/utils\/style$/ }, () => ({
        path: 'style',
        namespace: 'videojs-source-html',
      }));
      build.onLoad({ filter: /.*/, namespace: 'videojs-source-html' }, ({ path }) => ({
        contents: path === 'style' ? classNamesRuntime : jsxRuntime,
        loader: 'js',
      }));
      build.onLoad({ filter: /\.skin\.tsx$/ }, async ({ path }) => {
        const source = await readFile(path, 'utf8');
        const result = await compile(source, {
          filename: path,
          config: createHtmlSkinSourceConfig({
            style: options.style ?? 'tailwind',
            ...(options.tailwindInput ? { tailwindInput: options.tailwindInput } : {}),
            ...(styleProgram ? { styleProgram } : {}),
          }),
        });
        if (result.assets.length > 0) {
          throw new Error(`HTML source module \`${path}\` emitted CSS before the shared StyleProgram.`);
        }
        return { contents: result.code, loader: 'tsx', resolveDir: dirname(path) };
      });
    },
  };
}

function requiredTailwindInput(input: string | undefined): string {
  if (!input) throw new Error('HTML vanilla CSS source generation requires a Tailwind input file.');
  return input;
}

const classNamesRuntime = `
export function cn(...values) {
  return values.flat(Infinity).filter(Boolean).join(' ');
}
`;

const jsxRuntime = `
export const Fragment = Symbol('Fragment');
const raw = Symbol('raw-html');

export function jsx(type, props) {
  if (type === Fragment) return html(renderChildren(props?.children));
  if (typeof type === 'function') return type(props ?? {});

  const { children, ...attributes } = props ?? {};
  return html('<' + type + renderAttributes(attributes) + '>' + renderChildren(children) + '</' + type + '>');
}

export const jsxs = jsx;

function renderAttributes(attributes) {
  let output = '';
  for (const [name, value] of Object.entries(attributes)) {
    if (value == null || value === false || typeof value === 'function') continue;
    const attribute = name === 'className' ? 'class' : name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
    const normalized = attribute === 'class' ? [value].flat(Infinity).filter(Boolean).join(' ') : value;
    output += normalized === true ? ' ' + attribute : ' ' + attribute + '="' + escape(normalized) + '"';
  }
  return output;
}

function renderChildren(children) {
  return [children].flat(Infinity).filter((value) => value != null && value !== false).map((value) => {
    return value && typeof value === 'object' && raw in value ? value[raw] : escape(value);
  }).join('');
}

function escape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function html(value) {
  return { [raw]: value, toString() { return value; } };
}
`;
