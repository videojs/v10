import * as fs from 'node:fs';

import { parseSync } from 'oxc-parser';

import type { OxcProject } from './oxc-project.js';
import type { SourceFile } from './oxc-project.js';
import { getJSDocDescription, staticName, unwrapObjectExpression } from './oxc-project.js';
import type { CSSVarsExtraction } from './types.js';

/** Extract CSS custom properties from a component's vars.ts file. */
export function extractCSSVars(
  filePath: string,
  project: OxcProject | unknown,
  componentName: string
): CSSVarsExtraction | null {
  const oxcProject = isOxcProject(project) ? project : undefined;
  const file = oxcProject?.source(filePath) ?? parseSource(filePath);
  const declaration =
    oxcProject?.declarations(filePath, `${componentName}CSSVars`)[0]?.declaration ??
    findVariable(file, `${componentName}CSSVars`);
  if (!file || declaration?.type !== 'VariableDeclarator' || !declaration.init) return null;

  const object = unwrapObjectExpression(declaration.init);
  if (!object) return null;

  const vars: CSSVarsExtraction['vars'] = [];

  for (const property of object.properties) {
    if (
      property.type !== 'Property' ||
      property.kind !== 'init' ||
      property.value.type !== 'Literal' ||
      typeof property.value.value !== 'string'
    ) {
      continue;
    }

    vars.push({
      name: property.value.value,
      description: getJSDocDescription(file, property) ?? '',
    });
  }

  return vars.length > 0 ? { vars } : null;
}

function isOxcProject(value: unknown): value is OxcProject {
  return !!value && typeof value === 'object' && 'source' in value && typeof value.source === 'function';
}

function parseSource(filePath: string): SourceFile | undefined {
  if (!fs.existsSync(filePath)) return undefined;

  const source = fs.readFileSync(filePath, 'utf8');
  const parsed = parseSync(filePath, source);

  return { filePath, source, program: parsed.program, comments: parsed.comments };
}

function findVariable(file: SourceFile | undefined, name: string): import('oxc-parser').VariableDeclarator | undefined {
  if (!file) return undefined;

  for (const statement of file.program.body) {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (declaration?.type !== 'VariableDeclaration') continue;

    const variable = declaration.declarations.find((entry) => staticName(entry.id) === name);
    if (variable) return variable;
  }

  return undefined;
}
