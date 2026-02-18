import * as ts from 'typescript';
import * as tae from 'typescript-api-extractor';

export interface PartExport {
  /** PascalCase exported part name (e.g., "Value", "Group", "Separator"). */
  name: string;
  /** Local symbol name in the source module before aliasing. */
  localName: string;
  /** Source path (e.g., "./time-value", "./time-group"). */
  source: string;
}

/**
 * Extract part definitions from a React `index.parts.ts` file.
 *
 * Discovery algorithm:
 * 1. Parses named exports from `index.parts.ts` (filters out type-only exports)
 * 2. Each value export becomes a part: `export { Group } from './time-group'` -> part "Group"
 * 3. Source path is preserved for HTML element matching in the main builder
 *
 * If a part isn't appearing in the output:
 * - Ensure it's exported as a value export (not `type`-only) in `index.parts.ts`
 * - Ensure the source path follows `'./{component}-{part}'` naming
 */
export function extractParts(filePath: string, program: ts.Program): PartExport[] {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) return [];

  const parts: PartExport[] = [];

  function visit(node: ts.Node) {
    // Match: export { Name } from './source' or export { Name, type NameProps } from './source'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const source = node.moduleSpecifier.text;

      // Skip type-only export declarations (export type { ... } from '...')
      if (node.isTypeOnly) return;

      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          // Skip type-only specifiers (e.g., `type GroupProps`)
          if (element.isTypeOnly) continue;

          const localName = element.propertyName?.text ?? element.name.text;
          parts.push({
            name: element.name.text,
            localName,
            source,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return parts;
}

/**
 * Extract the JSDoc description from a React component export.
 *
 * Parses the file with `typescript-api-extractor`, finds the export matching
 * `partName`, and returns its description (stripping `@example` blocks).
 */
export function extractPartDescription(filePath: string, program: ts.Program, partName: string): string | undefined {
  const ast = tae.parseFromProgram(filePath, program);
  const component = ast.exports.find((exp) => exp.name === partName);
  let desc = component?.documentation?.description;
  if (desc) desc = desc.replace(/\n*@example[\s\S]*$/, '').trim();
  return desc || undefined;
}
