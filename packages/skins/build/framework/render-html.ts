import { readFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { runInNewContext } from 'node:vm';
import { compile } from '@videojs/compiler';
import { type OutputChunk, type Plugin, rolldown } from 'rolldown';
import { createCompilerHtmlConfig } from '../compiler/html.ts';
import type { SkinStyleManifest } from '../styles/manifest';
import type { MutableSkinStyleUsage } from '../styles/transform';

/** Render one canonical Skin entry to static light-DOM HTML. */
export async function renderHtmlSkin(
  entryFile: string,
  styles: SkinStyleManifest,
  usage: MutableSkinStyleUsage
): Promise<string> {
  const bundle = await rolldown({
    input: entryFile,
    platform: 'neutral',
    plugins: [canonicalHtmlPlugin(styles, usage)],
    transform: {
      jsx: { runtime: 'automatic', importSource: 'videojs-skins-html' },
    },
  });
  const result = await bundle.generate({ format: 'cjs' }).finally(() => bundle.close());
  const chunks = result.output.filter((output): output is OutputChunk => output.type === 'chunk');
  if (chunks.length !== 1) {
    throw new Error(`HTML source rendering expected one output chunk, but received ${chunks.length}.`);
  }
  const code = chunks[0]?.code;
  if (!code) throw new Error(`HTML source rendering produced no output for \`${entryFile}\`.`);

  const module = { exports: {} as Record<string, unknown> };
  runInNewContext(code, { module, exports: module.exports });
  const render = selectSkinRender(module.exports, entryFile);

  return String(render({})).trim();
}

function selectSkinRender(
  exports: Readonly<Record<string, unknown>>,
  entryFile: string
): (props: Record<string, never>) => unknown {
  if (typeof exports.default === 'function') {
    return exports.default as (props: Record<string, never>) => unknown;
  }

  const conventionalName = basename(entryFile)
    .replace(/(?:\.skin)?\.[^.]+$/, '')
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

function canonicalHtmlPlugin(styles: SkinStyleManifest, usage: MutableSkinStyleUsage): Plugin {
  return {
    name: 'videojs-skins-html',
    resolveId(source) {
      if (source === 'videojs-skins-html/jsx-runtime') return '\0videojs-skins-html:jsx-runtime';
      if (source === '@videojs/utils/style') return '\0videojs-skins-html:style';
      return null;
    },
    async load(id) {
      if (id === '\0videojs-skins-html:jsx-runtime') return { code: jsxRuntime, moduleType: 'js' };
      if (id === '\0videojs-skins-html:style') return { code: classNamesRuntime, moduleType: 'js' };
      if (!id.endsWith('.tsx')) return null;

      const source = await readFile(id, 'utf8');
      const result = await compile(source, {
        filename: id,
        config: createCompilerHtmlConfig({ style: 'vanilla', styles, usage }),
        configDir: dirname(id),
      });
      if (result.assets.length > 0) throw new Error(`HTML source module \`${id}\` unexpectedly emitted assets.`);
      return { code: result.code, moduleType: 'tsx' };
    },
  };
}

// These virtual modules exist only inside the Rolldown build above. They turn
// canonical JSX into a static string without introducing a framework runtime.
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
