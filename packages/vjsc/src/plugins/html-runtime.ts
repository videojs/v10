import type { Plugin } from 'rolldown';

const HTML_RUNTIME_ID = '\0vjsc:html-runtime';
const HTML_RUNTIME_SOURCE = 'vjsc/html-runtime';

export function htmlRuntimePlugin(): Plugin {
  return {
    name: 'vjsc:html-runtime',
    enforce: 'pre',
    resolveId: {
      order: 'pre',
      handler(id) {
        return id === `${HTML_RUNTIME_SOURCE}/jsx-runtime` || id === `${HTML_RUNTIME_SOURCE}/jsx-dev-runtime`
          ? HTML_RUNTIME_ID
          : null;
      },
    },
    load(id) {
      return id === HTML_RUNTIME_ID ? { code: HTML_RUNTIME, moduleType: 'js' } : null;
    },
  } as Plugin;
}

export const HTML_RUNTIME = `
import { escapeHtml } from '@videojs/utils/string';
import { htmlAttributeName } from 'vjsc/target';

export const Fragment = Symbol('Fragment');
const raw = Symbol('raw-html');
const element = Symbol('html-element');
const fragment = Symbol('html-fragment');
const scope = Symbol('html-scope');

export function jsx(type, props) {
  if (type === Fragment) return htmlFragment(props?.children);
  if (typeof type === 'function') return type(props ?? {});

  const { children, ...attributes } = props ?? {};
  return htmlElement(type, attributes, children);
}

export const jsxs = jsx;
export const jsxDEV = jsx;

export function Scope({ prefix, children }) {
  return renderable(scope, { prefix, children });
}

export function Host(props) {
  const { children, ...attributes } = props ?? {};
  const values = [children]
    .flat(Infinity)
    .filter((value) => value != null && value !== false && (typeof value !== 'string' || value.trim()));
  const child = values[0];

  if (values.length !== 1 || !child || typeof child !== 'object' || !(element in child)) {
    throw new Error('HTML <Host> requires exactly one element child.');
  }

  const current = child[element];
  return htmlElement(current.type, { ...current.attributes, ...attributes }, current.children);
}

function renderAttributes(attributes, context) {
  let output = '';
  const entries = Object.entries(attributes);
  entries.sort(([left], [right]) => (left === 'id' ? 1 : right === 'id' ? -1 : 0));

  for (const [name, value] of entries) {
    if (value == null || value === false || typeof value === 'function') continue;
    const normalized = name === 'className' || name === 'class'
      ? [value].flat(Infinity).filter(Boolean).join(' ')
      : resolveScopedId(value, context);
    const attribute = htmlAttributeName(name);
    output += normalized === true ? ' ' + attribute : ' ' + attribute + '="' + escapeHtml(String(normalized)) + '"';
  }

  return output;
}

function renderChildren(children, context) {
  return [children]
    .flat(Infinity)
    .filter((value) => value != null && value !== false)
    .map((value) => renderValue(value, context))
    .join('');
}

function renderValue(value, context) {
  if (!value || typeof value !== 'object') return escapeHtml(String(value));

  if (element in value) {
    const current = value[element];
    return '<' + current.type + renderAttributes(current.attributes, context) + '>' +
      renderChildren(current.children, context) + '</' + current.type + '>';
  }
  if (fragment in value) return renderChildren(value[fragment], context);
  if (scope in value) {
    const current = value[scope];
    const count = (context.counts.get(current.prefix) ?? 0) + 1;
    const scopes = new Map(context.scopes);

    context.counts.set(current.prefix, count);
    scopes.set(current.prefix, count === 1 ? 'vjs-' + current.prefix : 'vjs-' + current.prefix + '-' + count);
    return renderChildren(current.children, { counts: context.counts, scopes });
  }
  if (raw in value) return value[raw];
  return escapeHtml(String(value));
}

function resolveScopedId(value, context) {
  if (typeof value !== 'string' || !value.startsWith('__vjsc-id-')) return value;

  for (const [prefix, resolved] of context.scopes) {
    const marker = '__vjsc-id-' + prefix;
    if (value.startsWith(marker + '-')) return resolved + value.slice(marker.length);
  }

  throw new Error('HTML scoped identifier was rendered outside its component scope.');
}

function htmlElement(type, attributes, children) {
  return renderable(element, { type, attributes, children });
}

function htmlFragment(children) {
  return renderable(fragment, children);
}

function renderable(type, value) {
  return {
    [type]: value,
    toString() {
      return renderValue(this, { counts: new Map(), scopes: new Map() });
    },
  };
}
`;
