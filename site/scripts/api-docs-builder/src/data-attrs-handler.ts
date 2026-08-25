import type { Expression, ObjectProperty, TSType } from 'oxc-parser';

import { formatDetailedType } from './formatter.js';
import type { OxcProject, SourceFile } from './oxc-project.js';
import { getJSDoc, staticName, unwrapObjectExpression } from './oxc-project.js';
import type { DataAttrsExtraction } from './types.js';

/** Extract data attributes from a component's data.ts file. */
export function extractDataAttrs(
  filePath: string,
  project: OxcProject,
  componentName: string
): DataAttrsExtraction | null {
  const file = project.source(filePath);
  if (!file) return null;

  const possibleNames = [`${componentName}DataAttrs`, `${componentName}DataAttributes`];
  const attrs: DataAttrsExtraction['attrs'] = [];

  for (const name of possibleNames) {
    for (const resolved of project.declarations(filePath, name)) {
      if (resolved.declaration.type !== 'VariableDeclarator' || !resolved.declaration.init) continue;

      const object = unwrapObjectExpression(resolved.declaration.init);
      if (!object) continue;

      const satisfiesType = extractSatisfiesType(resolved.declaration.init);
      const stateTypes = satisfiesType ? inferStateTypes(satisfiesType, file, project) : undefined;

      for (const property of object.properties) {
        if (property.type !== 'Property' || property.kind !== 'init') continue;

        const propertyName = staticName(property.key);
        if (!propertyName) continue;

        const value =
          property.value.type === 'Literal' && typeof property.value.value === 'string'
            ? property.value.value
            : `data-${propertyName}`;
        const documentation = getJSDoc(file, property);
        const jsDocType = documentation?.tags
          .get('type')
          ?.at(-1)
          ?.replace(/^\{([\s\S]*)\}$/, '$1')
          .trim();
        const type = jsDocType || stateTypes?.get(propertyName);

        attrs.push({
          name: value,
          description: documentation?.description ?? '',
          ...(type ? { type } : {}),
        });
      }
    }
  }

  return attrs.length > 0 ? { attrs } : null;
}

function extractSatisfiesType(expression: Expression): TSType | undefined {
  if (expression.type === 'TSSatisfiesExpression') return expression.typeAnnotation;

  if (
    expression.type === 'ParenthesizedExpression' ||
    expression.type === 'TSAsExpression' ||
    expression.type === 'TSTypeAssertion' ||
    expression.type === 'TSNonNullExpression'
  ) {
    return extractSatisfiesType(expression.expression);
  }

  return undefined;
}

function inferStateTypes(type: TSType, file: SourceFile, project: OxcProject): Map<string, string> | undefined {
  if (type.type !== 'TSTypeReference' || !type.typeArguments?.params[0]) return undefined;

  const stateType = type.typeArguments.params[0];
  const members = project.interfaceMembers({ file, type: stateType });
  if (members.length === 0) return undefined;

  const result = new Map<string, string>();

  for (const resolved of members) {
    if (resolved.member.type !== 'TSPropertySignature' || !resolved.member.typeAnnotation) continue;

    const name = staticName(resolved.member.key);
    if (!name) continue;

    const formatted = formatDetailedType(
      project,
      {
        file: resolved.file,
        type: resolved.member.typeAnnotation.typeAnnotation,
        ...(resolved.substitutions ? { substitutions: resolved.substitutions } : {}),
      },
      resolved.member.optional
    );
    if (formatted === 'boolean' || formatted === 'false | true' || formatted === 'true | false') continue;

    result.set(name, formatted);
  }

  return result;
}

/** Parse the JSDoc associated with an object property. */
export function parseJsDoc(node: ObjectProperty, file: SourceFile): { description: string; type?: string } {
  const documentation = getJSDoc(file, node);
  const type = documentation?.tags
    .get('type')
    ?.at(-1)
    ?.replace(/^\{([\s\S]*)\}$/, '$1')
    .trim();

  return {
    description: documentation?.description ?? '',
    ...(type ? { type } : {}),
  };
}

/** Return the description attached to an object property. */
export function getJsDocComment(node: ObjectProperty, file: SourceFile): string {
  return getJSDoc(file, node)?.description ?? '';
}
