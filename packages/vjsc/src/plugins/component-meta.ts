import type {
  Expression,
  ObjectExpression,
  ObjectProperty,
  Program,
  PropertyKey,
  VariableDeclaration,
  VariableDeclarator,
} from '@oxc-project/types';
import type { Plugin, RolldownMagicString } from 'rolldown';

import type { ComponentMeta } from '../components/meta';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;

export interface ComponentModuleMeta {
  readonly componentMeta?: ComponentMeta | undefined;
  readonly componentSource?: string | undefined;
  readonly [key: string]: unknown;
}

interface ExportedMeta {
  readonly declaration: VariableDeclaration;
  readonly declarator: VariableDeclarator;
  readonly statement: Program['body'][number];
}

/**
 * Extract static component metadata and remove its export from runtime code. Use before source capture when registry
 * tooling needs a component's `meta` export.
 *
 * @example
 *   ```diff
 *   - export const meta = { name: 'play-button' };
 *   export function PlayButton() {}
 *   ```;
 *
 * @param exportName - Metadata export to extract. Defaults to `meta`.
 */
export function componentMetaPlugin(exportName = 'meta'): Plugin {
  return {
    name: 'vjsc:component-meta',
    transform: {
      filter: { id: SCRIPT_ID, code: exportName },
      handler(_code, id, transform) {
        const exported = findExportedMeta(transform.ast, exportName);
        if (!exported?.declarator.init) return null;

        const componentMeta = parseComponentMeta(exported.declarator.init, id, exportName);
        const magicString = transform.magicString;
        if (!magicString) throw new Error('vjsc: Rolldown did not provide MagicString to the component metadata pass.');

        removeDeclarator(magicString, exported);

        return {
          code: magicString,
          meta: mergeComponentModuleMeta(this.getModuleInfo(id)?.meta, { componentMeta }),
        };
      },
    },
  };
}

export function readComponentModuleMeta(meta: unknown): ComponentModuleMeta | undefined {
  if (!isRecord(meta)) return undefined;

  const componentMeta = isComponentMeta(meta.componentMeta) ? meta.componentMeta : undefined;
  const componentSource = typeof meta.componentSource === 'string' ? meta.componentSource : undefined;
  if (!componentMeta && componentSource === undefined) return undefined;

  return { ...meta, componentMeta, componentSource };
}

export function readComponentMeta(meta: unknown): ComponentMeta | undefined {
  return readComponentModuleMeta(meta)?.componentMeta;
}

export function readComponentSource(meta: unknown): string | undefined {
  return readComponentModuleMeta(meta)?.componentSource;
}

export function mergeComponentModuleMeta(
  meta: unknown,
  update: Partial<ComponentModuleMeta>
): Readonly<Record<string, unknown>> {
  return {
    ...(isRecord(meta) ? meta : {}),
    ...update,
  };
}

function findExportedMeta(ast: Program | undefined, exportName: string): ExportedMeta | undefined {
  if (!ast) return undefined;

  for (const statement of ast.body) {
    if (statement.type !== 'ExportNamedDeclaration' || statement.declaration?.type !== 'VariableDeclaration') {
      continue;
    }

    const declarator = statement.declaration.declarations.find(
      (candidate) => candidate.id.type === 'Identifier' && candidate.id.name === exportName
    );
    if (declarator) return { declaration: statement.declaration, declarator, statement };
  }

  return undefined;
}

function removeDeclarator(magicString: RolldownMagicString, exported: ExportedMeta): void {
  const declarations = exported.declaration.declarations;
  const index = declarations.indexOf(exported.declarator);

  if (declarations.length === 1) {
    magicString.remove(exported.statement.start, exported.statement.end);
  } else if (index < declarations.length - 1) {
    magicString.remove(exported.declarator.start, declarations[index + 1]!.start);
  } else {
    magicString.remove(declarations[index - 1]!.end, exported.declarator.end);
  }
}

function parseComponentMeta(expression: Expression, id: string, exportName: string): ComponentMeta {
  const value = staticValue(expression, id);

  if (!isRecord(value) || typeof value.name !== 'string' || value.name.length === 0) {
    throw new Error(`Component metadata \`${exportName}\` in ${id} must contain a non-empty literal \`name\`.`);
  }

  return value as ComponentMeta;
}

function staticValue(expression: Expression, id: string): unknown {
  const value = unwrapExpression(expression);

  if (value.type === 'Literal') {
    if (
      typeof value.value === 'string' ||
      typeof value.value === 'number' ||
      typeof value.value === 'boolean' ||
      value.value === null
    ) {
      return value.value;
    }

    throw nonStaticMeta(id);
  }

  if (value.type === 'UnaryExpression' && value.operator === '-') {
    const operand = staticValue(value.argument, id);
    if (typeof operand === 'number') return -operand;
  }

  if (value.type === 'TemplateLiteral' && value.expressions.length === 0) {
    return value.quasis[0]?.value.cooked ?? value.quasis[0]?.value.raw ?? '';
  }

  if (value.type === 'ArrayExpression') {
    return value.elements.map((element) => {
      if (!element || element.type === 'SpreadElement') throw nonStaticMeta(id);

      return staticValue(element, id);
    });
  }

  if (value.type === 'ObjectExpression') return staticObject(value, id);

  throw nonStaticMeta(id);
}

function staticObject(expression: ObjectExpression, id: string): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    expression.properties.map((property) => {
      if (property.type !== 'Property' || property.kind !== 'init' || property.method) {
        throw nonStaticMeta(id);
      }

      return [staticPropertyName(property, id), staticValue(property.value, id)];
    })
  );
}

function staticPropertyName(property: ObjectProperty, id: string): string {
  const key: PropertyKey = property.key;
  if (!property.computed && key.type === 'Identifier') return key.name;

  if (key.type === 'Literal' && (typeof key.value === 'string' || typeof key.value === 'number')) {
    return String(key.value);
  }

  throw nonStaticMeta(id);
}

function unwrapExpression(expression: Expression): Expression {
  if (
    expression.type === 'ParenthesizedExpression' ||
    expression.type === 'TSAsExpression' ||
    expression.type === 'TSSatisfiesExpression' ||
    expression.type === 'TSTypeAssertion'
  ) {
    return unwrapExpression(expression.expression);
  }

  return expression;
}

function nonStaticMeta(id: string): Error {
  return new Error(`Component metadata in ${id} must contain only static literal values.`);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isComponentMeta(value: unknown): value is ComponentMeta {
  return isRecord(value) && typeof value.name === 'string';
}
