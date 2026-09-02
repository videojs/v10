import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { isString } from '@videojs/utils/predicate';
import { type Declaration, type DeclarationBlock, transform } from 'lightningcss';

import { withoutNullValues } from '../styles/css-ast';
import { isInsideRoot } from '../utils/path';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const customAtRules = {
  theme: { prelude: '<custom-ident>', body: 'declaration-list' },
} as const;

/** Tailwind-only at-rules. Lightning CSS cannot parse Tailwind's `--value()` syntax, so these are read from source text. */
const registryAtRules = new Set(['utility', 'custom-variant']);

/** Nested Shadcn `css` entry: declarations are strings, blocks are objects, and statement at-rules are empty objects. */
export type TailwindRegistryCss = { readonly [key: string]: string | TailwindRegistryCss };

export interface TailwindRegistryTheme {
  readonly cssVars: Readonly<Record<string, string>>;
  readonly css: Readonly<Record<string, TailwindRegistryCss>>;
}

interface RenderedDeclaration {
  readonly name: string;
  readonly value: string;
}

interface ScannedAtRule {
  readonly name: string;
  readonly prelude: string;
  /** Block contents, or `undefined` for a statement at-rule. */
  readonly body: string | undefined;
  readonly end: number;
}

interface ScannedStatement {
  readonly text: string;
  /** Block contents when the statement opens a block. */
  readonly block: string | undefined;
  readonly end: number;
}

/** Extract Shadcn theme variables, utilities, and custom variants from one Tailwind CSS source. */
export async function readTailwindRegistryTheme(root: string, path: string): Promise<TailwindRegistryTheme> {
  const filename = resolve(root, path);

  if (!isInsideRoot(root, filename)) {
    throw new Error(`Shadcn registry Tailwind source must be inside the VJSC graph root: \`${path}\`.`);
  }

  const source = await readFile(filename, 'utf8');
  const css = new Map<string, TailwindRegistryCss>();
  const cssVars = new Map<string, string>();
  const remaining = extractRegistryAtRules(source, css, path);

  transform({
    filename,
    code: encoder.encode(remaining),
    customAtRules,
    visitor: {
      Rule: {
        custom: {
          theme(rule) {
            if (rule.prelude.value === 'inline') collectThemeVariables(rule.body.value, cssVars, path);
          },
        },
      },
    },
  });

  return {
    cssVars: Object.fromEntries(cssVars),
    css: Object.fromEntries(css),
  };
}

function collectThemeVariables(block: DeclarationBlock, variables: Map<string, string>, path: string): void {
  for (const [declaration, important] of declarationEntries(block)) {
    if (declaration.property !== 'custom' || !declaration.value.name.startsWith('--')) {
      throw new Error(
        `Shadcn registry Tailwind source \`${path}\` contains an unsupported declaration in \`@theme inline\`. ` +
          'Only custom-property declarations can be represented by Shadcn `cssVars.theme`.'
      );
    }

    addUnique(
      variables,
      declaration.value.name.slice(2),
      declarationValue(declaration, important),
      `Tailwind theme variable in \`${path}\``
    );
  }
}

/** Record top-level Tailwind at-rules as Shadcn `css` entries and return the source without them. */
function extractRegistryAtRules(source: string, css: Map<string, TailwindRegistryCss>, path: string): string {
  let output = '';
  let index = 0;
  let depth = 0;

  while (index < source.length) {
    const inertEnd = skipInert(source, index);

    if (inertEnd > index) {
      output += source.slice(index, inertEnd);
      index = inertEnd;
      continue;
    }

    const character = source[index]!;
    const name = depth === 0 && character === '@' ? readAtRuleName(source, index) : undefined;

    if (name === undefined || !registryAtRules.has(name)) {
      if (character === '{') depth++;
      else if (character === '}') depth--;

      output += character;
      index++;
      continue;
    }

    const rule = readAtRule(source, index, name, path);

    recordRegistryAtRule(css, rule, path);
    index = rule.end;
  }

  return output;
}

function recordRegistryAtRule(css: Map<string, TailwindRegistryCss>, rule: ScannedAtRule, path: string): void {
  if (!rule.prelude)
    throw new Error(`Shadcn registry Tailwind source \`${path}\` contains an unnamed \`@${rule.name}\`.`);

  const label = `Tailwind ${rule.name} \`${rule.prelude}\` in \`${path}\``;
  const value = rule.body === undefined ? {} : parseBlock(rule.body, path);

  if (rule.name === 'utility') {
    if (rule.body === undefined) throw new Error(`${label} must declare a block.`);

    if (!Object.values(value).every(isString)) throw new Error(`${label} must be a flat declaration list.`);
  }

  addUnique(css, `@${rule.name} ${rule.prelude}`, value, label);
}

function readAtRuleName(source: string, start: number): string | undefined {
  const match = /^@([a-zA-Z-]+)/.exec(source.slice(start, start + 64));

  return match?.[1];
}

function readAtRule(source: string, start: number, name: string, path: string): ScannedAtRule {
  const statement = readStatement(source, start + name.length + 1, path);
  if (!statement) throw new Error(`Shadcn registry Tailwind source \`${path}\` contains an unterminated \`@${name}\`.`);

  return { name, prelude: statement.text, body: statement.block, end: statement.end };
}

/** Parse block contents into nested Shadcn `css` entries. */
function parseBlock(body: string, path: string): TailwindRegistryCss {
  const entries: Record<string, string | TailwindRegistryCss> = {};
  let index = 0;

  while (index < body.length) {
    const statement = readStatement(body, index, path);
    if (!statement) break;

    if (statement.block !== undefined) {
      entries[statement.text] = parseBlock(statement.block, path);
    } else if (statement.text.startsWith('@')) {
      entries[statement.text] = {};
    } else {
      const colon = statement.text.indexOf(':');

      if (colon < 1)
        throw new Error(
          `Shadcn registry Tailwind source \`${path}\` contains an invalid declaration: \`${statement.text}\`.`
        );

      entries[statement.text.slice(0, colon).trim()] = statement.text.slice(colon + 1).trim();
    }

    index = statement.end;
  }

  return entries;
}

/** Read one declaration, statement at-rule, or block opener, ending after its `;` or matching `}`. */
function readStatement(source: string, start: number, path: string): ScannedStatement | undefined {
  let index = start;
  let depth = 0;
  let text = '';

  while (index < source.length) {
    const inertEnd = skipInert(source, index);

    if (inertEnd > index) {
      if (!source.startsWith('/*', index)) text += source.slice(index, inertEnd);

      index = inertEnd;
      continue;
    }

    const character = source[index]!;

    if (character === '(' || character === '[') depth++;
    else if (character === ')' || character === ']') depth--;

    if (depth === 0 && character === ';') return { text: collapseWhitespace(text), block: undefined, end: index + 1 };

    if (depth === 0 && character === '{') {
      const close = findBlockEnd(source, index, path);

      return { text: collapseWhitespace(text), block: source.slice(index + 1, close), end: close + 1 };
    }

    if (depth === 0 && character === '}') {
      throw new Error(`Shadcn registry Tailwind source \`${path}\` contains an unexpected \`}\`.`);
    }

    text += character;
    index++;
  }

  const trailing = collapseWhitespace(text);

  return trailing ? { text: trailing, block: undefined, end: index } : undefined;
}

/** Return the index of the `}` matching the `{` at `open`. */
function findBlockEnd(source: string, open: number, path: string): number {
  let index = open + 1;
  let depth = 1;

  while (index < source.length) {
    const inertEnd = skipInert(source, index);

    if (inertEnd > index) {
      index = inertEnd;
      continue;
    }

    const character = source[index]!;

    if (character === '{') depth++;
    else if (character === '}' && --depth === 0) return index;

    index++;
  }

  throw new Error(`Shadcn registry Tailwind source \`${path}\` contains an unterminated block.`);
}

/** Return the end of a comment or quoted string starting at `index`, or `index` when neither starts there. */
function skipInert(source: string, index: number): number {
  if (source.startsWith('/*', index)) {
    const close = source.indexOf('*/', index + 2);

    return close < 0 ? source.length : close + 2;
  }

  const quote = source[index];
  if (quote !== '"' && quote !== "'") return index;

  for (let cursor = index + 1; cursor < source.length; cursor++) {
    if (source[cursor] === '\\') cursor++;
    else if (source[cursor] === quote) return cursor + 1;
  }

  return source.length;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function declarationEntries(block: DeclarationBlock): Array<readonly [Declaration, boolean]> {
  return [
    ...(block.declarations ?? []).map((declaration) => [declaration, false] as const),
    ...(block.importantDeclarations ?? []).map((declaration) => [declaration, true] as const),
  ];
}

function declarationValue(declaration: Declaration, important: boolean): string {
  return renderDeclaration(declaration, important).value;
}

function renderDeclaration(declaration: Declaration, important: boolean): RenderedDeclaration {
  const result = transform({
    filename: 'registry-declaration.css',
    code: encoder.encode(''),
    visitor: {
      StyleSheet(stylesheet) {
        return withoutNullValues({
          ...stylesheet,
          rules: [
            {
              type: 'style' as const,
              value: {
                selectors: [[{ type: 'class' as const, name: 'vjsc' }]],
                declarations: {
                  declarations: important ? [] : [structuredClone(declaration)],
                  importantDeclarations: important ? [structuredClone(declaration)] : [],
                },
                rules: [],
                loc: { source_index: 0, line: 0, column: 1 },
              },
            },
          ],
        });
      },
    },
  });
  const output = decoder.decode(result.code);
  const body = output.slice(output.indexOf('{') + 1, output.lastIndexOf('}')).trim();
  const colon = body.indexOf(':');
  if (colon < 1 || !body.endsWith(';')) throw new Error('Lightning CSS did not serialize a registry declaration.');

  return {
    name: body.slice(0, colon).trim(),
    value: body.slice(colon + 1, -1).trim(),
  };
}

function addUnique<Value>(values: Map<string, Value>, name: string, value: Value, label: string): void {
  const previous = values.get(name);

  if (previous !== undefined && JSON.stringify(previous) !== JSON.stringify(value)) {
    throw new Error(`${label} defines \`${name}\` more than once with conflicting values.`);
  }

  values.set(name, value);
}
