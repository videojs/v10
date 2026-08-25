import type { Node } from '@oxc-project/types';
import { parseSync } from 'oxc-parser';
import { walk } from 'oxc-walker';

export interface ImportReference {
  readonly specifier: string;
  readonly kind: 'static' | 'dynamic' | 'type';
  readonly start: number;
  readonly end: number;
  readonly quote: string;
}

export interface ImportReplacement extends ImportReference {
  readonly replacement: string;
}

/** Locate editable ESM import specifiers without changing source formatting. */
export function analyzeImports(source: string, fileName: string): ImportReference[] {
  const parsed = parseSync(fileName, source);
  if (parsed.errors.length > 0) throw new Error(parsed.errors.map((error) => error.message).join('\n'));

  const references: ImportReference[] = [];

  walk(parsed.program, {
    enter(node) {
      const reference = importReference(node);
      if (!reference) return;

      const { literal, kind } = reference;

      references.push({
        specifier: literal.value,
        kind,
        start: literal.start,
        end: literal.end,
        quote: source[literal.start] === '`' ? '`' : source[literal.start] === '"' ? '"' : "'",
      });
    },
  });

  return references;
}

/** Replace import specifiers while preserving all other authored source text. */
export function replaceImportSpecifiers(source: string, replacements: readonly ImportReplacement[]): string {
  let output = source;

  for (const replacement of [...replacements].sort((left, right) => right.start - left.start)) {
    output =
      output.slice(0, replacement.start) +
      replacement.quote +
      escapeSpecifier(replacement.replacement, replacement.quote) +
      replacement.quote +
      output.slice(replacement.end);
  }

  return output;
}

interface StaticSpecifier {
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

function importReference(
  node: Node
): { readonly literal: StaticSpecifier; readonly kind: ImportReference['kind'] } | undefined {
  if (node.type === 'ImportDeclaration') {
    const typeOnly =
      node.importKind === 'type' ||
      (node.specifiers.length > 0 &&
        node.specifiers.every((specifier) => specifier.type === 'ImportSpecifier' && specifier.importKind === 'type'));

    return { literal: node.source, kind: typeOnly ? 'type' : 'static' };
  }

  if (node.type === 'ExportNamedDeclaration' && node.source) {
    const typeOnly =
      node.exportKind === 'type' ||
      (node.specifiers.length > 0 && node.specifiers.every((specifier) => specifier.exportKind === 'type'));

    return { literal: node.source, kind: typeOnly ? 'type' : 'static' };
  }

  if (node.type === 'ExportAllDeclaration') {
    return { literal: node.source, kind: node.exportKind === 'type' ? 'type' : 'static' };
  }

  if (node.type === 'ImportExpression') {
    if (node.source.type === 'Literal' && typeof node.source.value === 'string') {
      return { literal: node.source, kind: 'dynamic' };
    }

    if (node.source.type === 'TemplateLiteral' && node.source.expressions.length === 0) {
      const value = node.source.quasis[0]?.value.cooked;

      if (value !== null && value !== undefined) {
        return { literal: { value, start: node.source.start, end: node.source.end }, kind: 'dynamic' };
      }
    }
  }

  if (node.type === 'TSImportType') return { literal: node.source, kind: 'type' };

  return undefined;
}

function escapeSpecifier(specifier: string, quote: string): string {
  return specifier.replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`);
}
