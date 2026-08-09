import { basename } from 'node:path';
import { runInNewContext } from 'node:vm';

export const HTML_RUNTIME_ID = '\0@videojs/compiler:html-runtime';
export const HTML_RUNTIME_IMPORT = '@videojs/compiler/html-runtime/jsx-runtime';

/** Evaluate a bundled entry against the static JSX runtime and return its HTML. */
export function renderHtmlChunk(code: string, entryFile: string): string {
  const module = { exports: {} as Record<string, unknown> };
  runInNewContext(code, { module, exports: module.exports });
  return String(selectRender(module.exports, entryFile)({})).trim();
}

function selectRender(
  exports: Readonly<Record<string, unknown>>,
  entryFile: string
): (props: Record<string, never>) => unknown {
  if (typeof exports.default === 'function') return exports.default as (props: Record<string, never>) => unknown;

  const conventionalName = basename(entryFile)
    .replace(/(?:\.skin)?\.[^.]+$/, '')
    .replace(/(^|-)(\w)/g, (_, _dash, letter: string) => letter.toUpperCase());
  const conventional = Object.entries(exports).filter(
    ([name, value]) => typeof value === 'function' && (name === conventionalName || name.endsWith(conventionalName))
  );
  if (conventional.length === 1) return conventional[0]![1] as (props: Record<string, never>) => unknown;

  const functions = Object.entries(exports).filter(
    (item): item is [string, (props: Record<string, never>) => unknown] => typeof item[1] === 'function'
  );
  if (functions.length === 1) return functions[0]![1];

  const available = functions.map(([name]) => name).join(', ') || '(none)';
  throw new Error(
    `HTML build could not select the entry component in \`${entryFile}\`. ` +
      `Use a default export or leave exactly one function export. Function exports: ${available}.`
  );
}

export const HTML_RUNTIME = `
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
  const entries = Object.entries(attributes);
  entries.sort(([left], [right]) => left === 'id' ? 1 : right === 'id' ? -1 : 0);
  for (const [name, value] of entries) {
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
