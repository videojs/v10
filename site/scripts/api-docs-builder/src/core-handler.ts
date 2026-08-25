import type { Expression } from 'oxc-parser';

import { formatProperties } from './formatter.js';
import type { OxcProject, SourceFile } from './oxc-project.js';
import {
  expressionText,
  getJSDocDescription,
  staticName,
  unwrapExpression,
  unwrapObjectExpression,
} from './oxc-project.js';
import type { CoreExtraction, ExtractedProp } from './types.js';

/** Extract Props, State, and defaultProps from a core component file. */
export function extractCore(filePath: string, project: OxcProject, componentName: string): CoreExtraction | null {
  const propsDeclaration = project.resolveName(filePath, `${componentName}Props`);
  const stateDeclaration = project.resolveName(filePath, `${componentName}State`);
  if (!propsDeclaration && !stateDeclaration) return null;

  let props: ExtractedProp[] = [];
  let description: string | undefined;

  const propsName =
    propsDeclaration && 'id' in propsDeclaration.declaration ? staticName(propsDeclaration.declaration.id) : undefined;

  if (propsDeclaration && propsName) {
    const type = referenceType(propsName, propsDeclaration.declaration.start, propsDeclaration.declaration.end);

    props = Object.entries(
      formatProperties(project, project.interfaceMembers({ file: propsDeclaration.file, type }))
    ).map(([name, definition]) => ({ name, ...definition }));
    description = getJSDocDescription(propsDeclaration.file, propsDeclaration.declaration);
  }

  let state: ExtractedProp[] = [];

  const stateName =
    stateDeclaration && 'id' in stateDeclaration.declaration ? staticName(stateDeclaration.declaration.id) : undefined;

  if (stateDeclaration && stateName) {
    const type = referenceType(stateName, stateDeclaration.declaration.start, stateDeclaration.declaration.end);

    state = Object.entries(
      formatProperties(project, project.interfaceMembers({ file: stateDeclaration.file, type }))
    ).map(([name, definition]) => ({ name, ...definition }));
  }

  return {
    ...(description ? { description } : {}),
    props,
    state,
    defaultProps: extractDefaultProps(filePath, project, componentName),
  };
}

/** Extract the authored values from a component core's static defaultProps object. */
export function extractDefaultProps(
  filePath: string,
  project: OxcProject,
  componentName: string
): Record<string, string> {
  const resolved = project.classDeclaration(filePath, `${componentName}Core`);
  if (!resolved || resolved.declaration.type !== 'ClassDeclaration') return {};

  const defaultProps: Record<string, string> = {};

  for (const member of resolved.declaration.body.body) {
    if (member.type !== 'PropertyDefinition' || !member.static || staticName(member.key) !== 'defaultProps') continue;

    const object = unwrapObjectExpression(member.value);
    if (!object) continue;

    for (const property of object.properties) {
      if (property.type !== 'Property' || property.kind !== 'init') continue;

      const name = staticName(property.key);
      if (!name) continue;

      const value = getPropertyValue(property.value, resolved.file);

      if (value !== undefined) defaultProps[name] = value;
    }
  }

  return defaultProps;
}

/** Get the display form of an authored default value. */
export function getPropertyValue(node: Expression, file: SourceFile): string | undefined {
  const expression = unwrapExpression(node);

  if (expression.type === 'Literal') {
    if (typeof expression.value === 'string') return `'${expression.value.replaceAll("'", "\\'")}'`;

    if (expression.value === null) return 'null';

    if (typeof expression.value === 'number' || typeof expression.value === 'boolean') return String(expression.value);
  }

  if (expression.type === 'ArrayExpression' && expression.elements.length === 0) return '[]';

  if (expression.type === 'ObjectExpression' && expression.properties.length === 0) return '{}';

  return expressionText(file, expression);
}

function referenceType(name: string, start: number, end: number): import('oxc-parser').TSTypeReference {
  return {
    type: 'TSTypeReference',
    typeName: { type: 'Identifier', name, start, end },
    typeArguments: null,
    start,
    end,
  };
}
