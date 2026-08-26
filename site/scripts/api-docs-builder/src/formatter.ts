import { uniq } from 'es-toolkit/array';
import type { BindingPattern, ParamPattern, TSSignature, TSType } from 'oxc-parser';

import type { OxcProject, ResolvedMember, ResolvedType, SourceFile } from './oxc-project.js';
import { getJSDoc, sourceText, staticName, typeNameText, unwrapType } from './oxc-project.js';
import type { PropDef } from './types.js';

/**
 * Detect if a type string is a single function type (vs a top-level union).
 *
 * Tracks bracket depth to find the matching `)` for the opening `(` of the parameter list, then checks if `=>` follows.
 * Returns `false` for top-level unions that happen to contain a function member (e.g., `((state: object) => string) |
 * undefined`).
 */
function isFunctionType(type: string): boolean {
  if (!type.startsWith('(')) return false;

  let depth = 0;

  for (let i = 0; i < type.length; i++) {
    if (type[i] === '(' || type[i] === '{' || type[i] === '[') depth++;
    else if (type[i] === ')' || type[i] === '}' || type[i] === ']') depth--;

    if (depth === 0) {
      return type
        .slice(i + 1)
        .trimStart()
        .startsWith('=>');
    }
  }

  return false;
}

/**
 * Get abbreviated type for display in collapsed rows.
 *
 * Returns an abbreviated string when abbreviation adds value, `undefined` otherwise.
 */
export function abbreviateType(name: string, type: string): string | undefined {
  // Pure function types (no union) → "function"
  // Also matches function types whose return is a union (e.g., `(state: object) => X | undefined`)
  if (type.includes('=>') && (!type.includes(' | ') || isFunctionType(type))) {
    return 'function';
  }

  // Callbacks → "function"
  if (/^(on|get)[A-Z]/.test(name) && type.includes('=>')) {
    return 'function';
  }

  // className/style/render → simplified
  if (name === 'className' && type.includes('=>')) {
    return 'string | function';
  }

  if (name === 'style' && type.includes('=>')) {
    return 'CSSProperties | function';
  }

  if (name === 'render' && type.includes('=>')) {
    return 'ReactElement | function';
  }

  // Simple types → no abbreviation needed
  if (['boolean', 'string', 'number'].includes(type)) {
    return undefined;
  }

  // Object literal > 40 chars → "object"
  if (type.startsWith('{ ') && type.length > 40) {
    return 'object';
  }

  // Short unions (less than 3 members and under 40 chars) → no abbreviation
  if (!type.includes(' | ') || (type.split(' | ').length < 3 && type.length < 40 && !type.includes('=>'))) {
    return undefined;
  }

  // Function in union → "type | function"
  if (type.includes('=>')) {
    const parts = type.split(' | ');
    const nonFunctionParts = parts.filter((p) => !p.includes('=>'));
    if (nonFunctionParts.length > 0) return `${nonFunctionParts.join(' | ')} | function`;

    return 'function';
  }

  // Any other type > 40 chars → truncated for display, full in detailedType
  if (type.length > 40) {
    return `${type.slice(0, 37)}...`;
  }

  // Complex unions → no abbreviation needed (show full type)
  return undefined;
}

/** Format a list of properties into API reference format. */
export function formatProperties(project: OxcProject, props: readonly ResolvedMember[]): Record<string, PropDef> {
  const result: Record<string, PropDef> = {};

  for (const prop of props) {
    if (prop.member.type !== 'TSPropertySignature') continue;

    const name = staticName(prop.member.key);
    if (!name || !prop.member.typeAnnotation) continue;

    // Skip ref for components
    if (name === 'ref') continue;

    // Skip props marked with @ignore
    const documentation = getJSDoc(prop.file, prop.member);
    if (documentation?.tags.has('ignore')) continue;

    const resolvedType: ResolvedType = {
      file: prop.file,
      type: prop.member.typeAnnotation.typeAnnotation,
      ...(prop.substitutions ? { substitutions: prop.substitutions } : {}),
    };
    const expandedType = formatDetailedType(project, resolvedType, prop.member.optional);
    const abbreviated = abbreviateType(name, expandedType);

    const entry: PropDef = { type: abbreviated ?? expandedType };

    if (abbreviated && expandedType !== abbreviated) entry.detailedType = expandedType;

    const defaultValue = documentation?.tags.get('default')?.at(-1) ?? documentation?.tags.get('defaultValue')?.at(-1);

    if (defaultValue !== undefined) entry.default = defaultValue;

    if (!prop.member.optional) entry.required = true;

    if (documentation?.description !== undefined) entry.description = documentation.description;

    result[name] = entry;
  }

  return result;
}

/**
 * Format a type into a human-readable string, expanding type aliases when possible.
 *
 * Resolves referenced declarations through the OXC project so aliases like `TimeType` expand to their underlying union
 * (`'current' | 'duration' | 'remaining'`).
 */
export function formatDetailedType(
  project: OxcProject,
  type: ResolvedType,
  removeUndefined: boolean,
  visited: Set<string> = new Set()
): string {
  if (type.deepPartial) return formatDeepPartialType(project, type, removeUndefined, visited);

  const node = unwrapType(type.type);

  if (node.type === 'TSTypeReference') {
    const name = typeNameText(node.typeName);
    const substituted = node.typeName.type === 'Identifier' ? type.substitutions?.get(name) : undefined;
    if (substituted) return formatDetailedType(project, substituted, removeUndefined, visited);

    const key = `${type.file.filePath}#${name}`;

    if (!visited.has(key)) {
      const resolved = project.resolveType(type);

      if (resolved) {
        if (resolved.file.filePath.includes(`${pathSeparator}node_modules${pathSeparator}`)) {
          return formatType(type, removeUndefined);
        }

        visited.add(key);
        return formatDetailedType(project, resolved, removeUndefined, visited);
      }
    }

    return formatType(type, removeUndefined);
  }

  if (node.type === 'TSUnionType') {
    const formattedMemberTypes = uniq(
      orderMembers(flattenUnionMembers(node.types, removeUndefined)).map((member) =>
        formatDetailedType(project, { ...type, type: member }, removeUndefined, visited)
      )
    );

    return formattedMemberTypes.join(' | ');
  }

  if (node.type === 'TSIntersectionType') {
    return orderMembers(node.types)
      .map((member) => formatDetailedType(project, { ...type, type: member }, false, visited))
      .join(' & ');
  }

  return formatType(type, removeUndefined);
}

const pathSeparator = process.platform === 'win32' ? '\\' : '/';

function formatDeepPartialType(
  project: OxcProject,
  type: ResolvedType,
  removeUndefined: boolean,
  visited: Set<string>
): string {
  const node = unwrapType(type.type);

  if (node.type === 'TSTypeReference') {
    const name = typeNameText(node.typeName);
    const key = `${type.file.filePath}#deep-partial#${name}`;

    if (!visited.has(key)) {
      const resolved = project.resolveType(type);

      if (resolved) {
        visited.add(key);
        return formatDeepPartialType(project, { ...resolved, deepPartial: true }, removeUndefined, visited);
      }
    }
  }

  if (node.type === 'TSTypeLiteral') {
    const members = node.members.flatMap((member) => {
      if (member.type !== 'TSPropertySignature' || !member.typeAnnotation) return [];

      const name = staticName(member.key);
      if (!name) return [];

      const memberType = formatDeepPartialType(
        project,
        { ...type, type: member.typeAnnotation.typeAnnotation, deepPartial: true },
        true,
        new Set(visited)
      );

      return [`${name}?: ${memberType}`];
    });

    return members.length > 0 ? `{ ${members.join('; ')} }` : 'object';
  }

  if (node.type === 'TSUnionType') {
    return uniq(
      orderMembers(flattenUnionMembers(node.types, removeUndefined)).map((member) =>
        formatDeepPartialType(project, { ...type, type: member, deepPartial: true }, removeUndefined, new Set(visited))
      )
    ).join(' | ');
  }

  if (node.type === 'TSIntersectionType') {
    return node.types
      .map((member) =>
        formatDeepPartialType(project, { ...type, type: member, deepPartial: true }, false, new Set(visited))
      )
      .join(' & ');
  }

  return formatDetailedType(project, { ...type, deepPartial: false }, removeUndefined, visited);
}

/** Format a type into a human-readable string. */
export function formatType(type: ResolvedType, removeUndefined: boolean): string {
  const node = unwrapType(type.type);
  const keyword = keywordName(node);
  if (keyword) return keyword;

  if (node.type === 'TSTypeReference') {
    const name = typeNameText(node.typeName);
    const substituted = node.typeName.type === 'Identifier' ? type.substitutions?.get(node.typeName.name) : undefined;
    if (substituted) return formatType(substituted, removeUndefined);

    if (name === 'ReactElement' || name === 'React.ReactElement') return 'ReactElement';

    const displayName = name.startsWith('React.') ? name.slice('React.'.length) : name;
    const args = node.typeArguments?.params ?? [];

    return args.length > 0
      ? `${displayName}<${args.map((argument) => formatType({ ...type, type: argument }, false)).join(', ')}>`
      : displayName;
  }

  if (node.type === 'TSUnionType') {
    const formattedMemberTypes = uniq(
      orderMembers(flattenUnionMembers(node.types, removeUndefined)).map((member) =>
        formatType({ ...type, type: member }, removeUndefined)
      )
    );

    return formattedMemberTypes.join(' | ');
  }

  if (node.type === 'TSIntersectionType') {
    return orderMembers(node.types)
      .map((member) => formatType({ ...type, type: member }, false))
      .join(' & ');
  }

  if (node.type === 'TSTypeLiteral') {
    if (node.members.length === 0) return 'object';

    return `{ ${node.members
      .map((member) => formatSignature(type.file, member, type.substitutions))
      .filter(Boolean)
      .join('; ')} }`;
  }

  if (node.type === 'TSLiteralType') {
    return normalizeQuotes(sourceText(type.file, node.literal));
  }

  if (node.type === 'TSArrayType') {
    const formattedMemberType = formatType({ ...type, type: node.elementType }, false);
    const element = unwrapType(node.elementType);
    if (element.type === 'TSUnionType' || element.type === 'TSIntersectionType') return `(${formattedMemberType})[]`;

    return `${formattedMemberType}[]`;
  }

  if (node.type === 'TSFunctionType' || node.type === 'TSConstructorType') {
    const params = node.params.map((parameter) => formatParameter(type.file, parameter, type.substitutions)).join(', ');
    const returnType = formatType({ ...type, type: node.returnType.typeAnnotation }, false);

    return `((${params}) => ${returnType})`;
  }

  if (node.type === 'TSTupleType') {
    return `[${node.elementTypes.map((member) => formatType({ ...type, type: tupleElementType(member) }, false)).join(', ')}]`;
  }

  if (node.type === 'TSConditionalType' || node.type === 'TSMappedType' || node.type === 'TSInferType') {
    return sourceText(type.file, node).replace(/\s+/g, ' ').trim();
  }

  return normalizeTypeText(sourceText(type.file, node));
}

function flattenUnionMembers(members: readonly TSType[], removeUndefined: boolean): TSType[] {
  return members
    .filter((member) => !removeUndefined || member.type !== 'TSUndefinedKeyword')
    .flatMap((member) => {
      if (member.type === 'TSUnionType') return member.types;

      return member;
    });
}

/** Order members so null, undefined, and any come last. */
function orderMembers(members: readonly TSType[]): readonly TSType[] {
  let ordered = pushToEnd(members, 'any');

  ordered = pushToEnd(ordered, 'null');
  ordered = pushToEnd(ordered, 'undefined');
  return ordered;
}

function pushToEnd(members: readonly TSType[], name: string): readonly TSType[] {
  const index = members.findIndex((member) => keywordName(member) === name);

  if (index !== -1) {
    const member = members[index];

    return [...members.slice(0, index), ...members.slice(index + 1), member!];
  }

  return members;
}

function normalizeQuotes(str: string): string {
  if (str.startsWith('"') && str.endsWith('"')) {
    return str
      .replaceAll("'", "\\'")
      .replaceAll('\\"', '"')
      .replace(/^"(.*)"$/, "'$1'");
  }

  return str;
}

function keywordName(type: TSType): string | undefined {
  const names: Partial<Record<TSType['type'], string>> = {
    TSAnyKeyword: 'any',
    TSBigIntKeyword: 'bigint',
    TSBooleanKeyword: 'boolean',
    TSIntrinsicKeyword: 'intrinsic',
    TSNeverKeyword: 'never',
    TSNullKeyword: 'null',
    TSNumberKeyword: 'number',
    TSObjectKeyword: 'object',
    TSStringKeyword: 'string',
    TSSymbolKeyword: 'symbol',
    TSThisType: 'this',
    TSUndefinedKeyword: 'undefined',
    TSUnknownKeyword: 'unknown',
    TSVoidKeyword: 'void',
  };

  return names[type.type];
}

function formatSignature(
  file: SourceFile,
  member: TSSignature,
  substitutions?: ReadonlyMap<string, ResolvedType>
): string {
  if (member.type === 'TSPropertySignature') {
    const name = staticName(member.key);
    if (!name || !member.typeAnnotation) return '';

    return `${name}${member.optional ? '?' : ''}: ${formatType({ file, type: member.typeAnnotation.typeAnnotation, substitutions }, member.optional)}`;
  }

  if (member.type === 'TSMethodSignature') {
    const name = staticName(member.key);
    if (!name) return '';

    const params = member.params.map((parameter) => formatParameter(file, parameter, substitutions)).join(', ');
    const returnType = member.returnType
      ? formatType({ file, type: member.returnType.typeAnnotation, substitutions }, false)
      : 'void';

    return `${name}${member.optional ? '?' : ''}(${params}): ${returnType}`;
  }

  return normalizeTypeText(sourceText(file, member));
}

function formatParameter(
  file: SourceFile,
  parameter: ParamPattern,
  substitutions?: ReadonlyMap<string, ResolvedType>
): string {
  const pattern = parameterPattern(parameter);
  if (!pattern) return '...: unknown';

  const name = bindingName(pattern);
  const annotation = pattern.typeAnnotation?.typeAnnotation;
  const optional = 'optional' in pattern && pattern.optional;
  const type = annotation ? formatType({ file, type: annotation, substitutions }, !!optional) : 'unknown';

  return `${parameter.type === 'RestElement' ? '...' : ''}${name}${optional ? '?' : ''}: ${type}`;
}

function parameterPattern(parameter: ParamPattern): BindingPattern | undefined {
  if (parameter.type === 'RestElement') return parameter.argument;

  if (parameter.type === 'TSParameterProperty') return parameter.parameter;

  return parameter;
}

function bindingName(pattern: BindingPattern): string {
  if (pattern.type === 'Identifier') return pattern.name;

  return '...';
}

function tupleElementType(element: import('oxc-parser').TSTupleElement): TSType {
  if (element.type === 'TSOptionalType' || element.type === 'TSRestType') return element.typeAnnotation;

  return element;
}

function normalizeTypeText(value: string): string {
  return normalizeQuotes(value.replace(/\s+/g, ' ').trim()) || 'unknown';
}
