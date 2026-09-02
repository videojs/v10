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
import { SCRIPT_MODULE_ID } from '../utils/module-id';

export interface ModuleBuildMeta {
  readonly moduleMeta?: ComponentMeta | undefined;
  /** Whether the metadata export was removed from the transformed source, so the graph can skip re-parsing. */
  readonly metaRemoved?: boolean | undefined;
  readonly moduleSource?: string | undefined;
  readonly moduleStyles?:
    | {
        readonly files: readonly string[];
        readonly assets: readonly string[];
      }
    | undefined;
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
      filter: { id: SCRIPT_MODULE_ID, code: exportName },
      handler(_code, id, transform) {
        const exported = findExportedMeta(transform.ast, exportName);
        if (!exported?.declarator.init) return null;

        const moduleMeta = parseComponentMeta(exported.declarator.init, id, exportName);
        const magicString = transform.magicString;
        if (!magicString) throw new Error('vjsc: Rolldown did not provide MagicString to the component metadata pass.');

        removeDeclarator(magicString, exported);

        return {
          code: magicString,
          meta: mergeModuleBuildMeta(this.getModuleInfo(id)?.meta, { moduleMeta, metaRemoved: true }),
        };
      },
    },
  };
}

export function readModuleBuildMeta(meta: unknown): ModuleBuildMeta | undefined {
  if (!isRecord(meta)) return undefined;

  const moduleMeta = isComponentMeta(meta.moduleMeta) ? meta.moduleMeta : undefined;
  const moduleSource = typeof meta.moduleSource === 'string' ? meta.moduleSource : undefined;
  const moduleStyles = readModuleStyles(meta.moduleStyles);
  const metaRemoved = meta.metaRemoved === true ? true : undefined;
  if (!moduleMeta && moduleSource === undefined && moduleStyles === undefined && !metaRemoved) return undefined;

  return { ...meta, moduleMeta, moduleSource, moduleStyles, metaRemoved };
}

export function readComponentMeta(meta: unknown): ComponentMeta | undefined {
  return readModuleBuildMeta(meta)?.moduleMeta;
}

export function readComponentSource(meta: unknown): string | undefined {
  return readModuleBuildMeta(meta)?.moduleSource;
}

export function readModuleStyles(meta: unknown): ModuleBuildMeta['moduleStyles'] {
  if (!isRecord(meta)) return undefined;

  const value = isRecord(meta.moduleStyles) ? meta.moduleStyles : meta;

  const files = readStringArray(value.files);
  const assets = readStringArray(value.assets);

  return files && assets ? { files, assets } : undefined;
}

export function mergeModuleBuildMeta(
  meta: unknown,
  update: Partial<ModuleBuildMeta>
): Readonly<Record<string, unknown>> {
  return {
    ...(isRecord(meta) ? meta : {}),
    ...update,
  };
}

function readStringArray(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : undefined;
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
