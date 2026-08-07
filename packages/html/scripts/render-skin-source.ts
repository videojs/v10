import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { runInNewContext } from 'node:vm';
import { compile } from '@videojs/compiler';
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
  const styles = new Map<string, string>();
  const result = await build({
    entryPoints: [entryFile],
    bundle: true,
    format: 'cjs',
    platform: 'neutral',
    write: false,
    jsx: 'automatic',
    jsxImportSource: 'source-ui-html',
    plugins: [canonicalHtmlPlugin(options, styles)],
  });
  const code = result.outputFiles[0]?.text;
  if (!code) throw new Error(`HTML source rendering produced no output for \`${entryFile}\`.`);

  const module = { exports: {} as Record<string, unknown> };
  runInNewContext(code, { module, exports: module.exports });
  const render = Object.values(module.exports).find(
    (value): value is (props: Record<string, never>) => unknown => typeof value === 'function'
  );
  if (!render) throw new Error(`HTML source rendering found no component export in \`${entryFile}\`.`);

  return {
    html: String(render({})).trim(),
    css: [...styles.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, source]) => source)
      .join('\n\n'),
  };
}

function canonicalHtmlPlugin(options: RenderSkinSourceOptions, styles: Map<string, string>): Plugin {
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
          }),
        });
        for (const asset of result.assets) styles.set(path, asset.source);
        return { contents: result.code, loader: 'tsx', resolveDir: dirname(path) };
      });
    },
  };
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
