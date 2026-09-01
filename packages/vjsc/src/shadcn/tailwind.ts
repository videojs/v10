import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { type Declaration, type DeclarationBlock, transform } from 'lightningcss';

import { withoutNullValues } from '../styles/css-ast';
import { isInsideRoot } from '../utils/path';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const customAtRules = {
  theme: { prelude: '<custom-ident>', body: 'declaration-list' },
  utility: { prelude: '<custom-ident>', body: 'declaration-list' },
} as const;

export interface TailwindRegistryTheme {
  readonly cssVars: Readonly<Record<string, string>>;
  readonly css: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

interface RenderedDeclaration {
  readonly name: string;
  readonly value: string;
}

/** Extract Shadcn theme variables and utilities from one Tailwind CSS source. */
export async function readTailwindRegistryTheme(root: string, path: string): Promise<TailwindRegistryTheme> {
  const filename = resolve(root, path);

  if (!isInsideRoot(root, filename)) {
    throw new Error(`Shadcn registry Tailwind source must be inside the VJSC graph root: \`${path}\`.`);
  }

  const source = await readFile(filename, 'utf8');
  const cssVars = new Map<string, string>();
  const css = new Map<string, Map<string, string>>();

  transform({
    filename,
    code: encoder.encode(source),
    customAtRules,
    visitor: {
      Rule: {
        custom: {
          theme(rule) {
            if (rule.prelude.value === 'inline') collectThemeVariables(rule.body.value, cssVars, path);
          },
          utility(rule) {
            collectUtility(rule.prelude.value, rule.body.value, css, path);
          },
        },
      },
    },
  });

  return {
    cssVars: Object.fromEntries(cssVars),
    css: Object.fromEntries([...css].map(([name, declarations]) => [name, Object.fromEntries(declarations)])),
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

function collectUtility(
  name: string,
  block: DeclarationBlock,
  utilities: Map<string, Map<string, string>>,
  path: string
): void {
  if (!name) throw new Error(`Shadcn registry Tailwind source \`${path}\` contains an unnamed \`@utility\`.`);

  const declarations = utilities.get(`@utility ${name}`) ?? new Map<string, string>();

  for (const [declaration, important] of declarationEntries(block)) {
    const rendered = renderDeclaration(declaration, important);

    addUnique(declarations, rendered.name, rendered.value, `Tailwind utility \`${name}\` in \`${path}\``);
  }

  utilities.set(`@utility ${name}`, declarations);
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

function addUnique(values: Map<string, string>, name: string, value: string, label: string): void {
  const previous = values.get(name);

  if (previous !== undefined && previous !== value) {
    throw new Error(`${label} defines \`${name}\` more than once with conflicting values.`);
  }

  values.set(name, value);
}
