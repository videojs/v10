import { uniq } from 'es-toolkit/array';
import * as tae from 'typescript-api-extractor';

/**
 * Get abbreviated type for display in collapsed rows.
 *
 * Returns `shortType` when abbreviation adds value, `undefined` otherwise.
 */
export function getShortPropType(name: string, type: string): string | undefined {
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

  // Short unions (less than 3 members and under 40 chars) → no abbreviation
  if (!type.includes(' | ') || (type.split(' | ').length < 3 && type.length < 40)) {
    return undefined;
  }

  // Function in union → "type | function"
  if (type.includes('=>')) {
    const parts = type.split(' | ');
    const nonFunctionParts = parts.filter((p) => !p.includes('=>'));
    if (nonFunctionParts.length > 0) {
      return `${nonFunctionParts.join(' | ')} | function`;
    }
    return 'function';
  }

  // Complex unions → no abbreviation needed (show full type)
  return undefined;
}

/**
 * Format a list of properties into API reference format.
 */
export function formatProperties(
  props: tae.PropertyNode[]
): Record<string, { type: string; shortType?: string; description?: string; default?: string; required?: boolean }> {
  const result: Record<string, any> = {};

  for (const prop of props) {
    // Skip ref for components
    if (prop.name === 'ref') continue;
    // Skip props marked with @ignore
    if (prop.documentation?.hasTag('ignore')) continue;

    const formattedType = formatType(prop.type, prop.optional);
    const shortType = getShortPropType(prop.name, formattedType);

    const resultObject: Record<string, any> = {
      type: formattedType,
      shortType,
      default: prop.documentation?.defaultValue,
      required: !prop.optional || undefined,
      description: prop.documentation?.description,
    };

    // Clean up undefined values
    Object.keys(resultObject).forEach((key) => {
      if (resultObject[key] === undefined) delete resultObject[key];
    });

    result[prop.name] = resultObject;
  }

  return result;
}

/**
 * Format a type into a human-readable string.
 */
export function formatType(type: tae.AnyType, removeUndefined: boolean): string {
  if (type instanceof tae.ExternalTypeNode) {
    if (/^ReactElement(<.*>)?/.test(type.typeName.name || '')) {
      return 'ReactElement';
    }

    if (type.typeName.namespaces?.length === 1 && type.typeName.namespaces[0] === 'React') {
      return createNameWithTypeArguments(type.typeName);
    }

    return getFullyQualifiedName(type.typeName);
  }

  if (type instanceof tae.IntrinsicNode) {
    return type.typeName ? getFullyQualifiedName(type.typeName) : type.intrinsic;
  }

  if (type instanceof tae.UnionNode) {
    if (type.typeName) {
      return getFullyQualifiedName(type.typeName);
    }

    let memberTypes = type.types;

    if (removeUndefined) {
      memberTypes = memberTypes.filter((t) => !(t instanceof tae.IntrinsicNode && t.intrinsic === 'undefined'));
    }

    const flattenedMemberTypes = memberTypes.flatMap((t) => {
      if (t instanceof tae.UnionNode) {
        return t.typeName ? t : t.types;
      }
      if (t instanceof tae.TypeParameterNode && t.constraint instanceof tae.UnionNode) {
        return t.constraint.types;
      }
      return t;
    });

    const formattedMemberTypes = uniq(orderMembers(flattenedMemberTypes).map((t) => formatType(t, removeUndefined)));

    return formattedMemberTypes.join(' | ');
  }

  if (type instanceof tae.IntersectionNode) {
    if (type.typeName) {
      return getFullyQualifiedName(type.typeName);
    }

    return orderMembers(type.types)
      .map((t) => formatType(t, false))
      .join(' & ');
  }

  if (type instanceof tae.ObjectNode) {
    if (type.typeName) {
      return getFullyQualifiedName(type.typeName);
    }

    if (type.properties.length === 0) {
      return '{}';
    }

    return `{ ${type.properties.map((m) => `${m.name}${m.optional ? '?' : ''}: ${formatType(m.type, m.optional)}`).join('; ')} }`;
  }

  if (type instanceof tae.LiteralNode) {
    return normalizeQuotes(type.value as string);
  }

  if (type instanceof tae.ArrayNode) {
    const formattedMemberType = formatType(type.elementType, false);
    if (formattedMemberType.includes(' ')) {
      return `(${formattedMemberType})[]`;
    }
    return `${formattedMemberType}[]`;
  }

  if (type instanceof tae.FunctionNode) {
    if (type.typeName) {
      return getFullyQualifiedName(type.typeName);
    }

    const functionSignature = type.callSignatures
      .map((s) => {
        const params = s.parameters.map((p) => `${p.name}: ${formatType(p.type, false)}`).join(', ');
        const returnType = formatType(s.returnValueType, false);
        return `(${params}) => ${returnType}`;
      })
      .join(' | ');
    return `(${functionSignature})`;
  }

  if (type instanceof tae.TupleNode) {
    if (type.typeName) {
      return getFullyQualifiedName(type.typeName);
    }
    return `[${type.types.map((member: tae.AnyType) => formatType(member, false)).join(', ')}]`;
  }

  if (type instanceof tae.TypeParameterNode) {
    return type.constraint !== undefined ? formatType(type.constraint, removeUndefined) : type.name;
  }

  return 'unknown';
}

function getFullyQualifiedName(typeName: tae.TypeName): string {
  const nameWithTypeArgs = createNameWithTypeArguments(typeName);

  if (!typeName.namespaces || typeName.namespaces.length === 0) {
    return nameWithTypeArgs;
  }

  return `${typeName.namespaces.join('.')}.${nameWithTypeArgs}`;
}

function createNameWithTypeArguments(typeName: tae.TypeName): string {
  if (
    typeName.typeArguments &&
    typeName.typeArguments.length > 0 &&
    typeName.typeArguments.some((ta) => ta.equalToDefault === false)
  ) {
    return `${typeName.name}<${typeName.typeArguments.map((ta) => formatType(ta.type, false)).join(', ')}>`;
  }

  return typeName.name;
}

/**
 * Order members so null, undefined, and any come last.
 */
function orderMembers(members: readonly tae.AnyType[]): readonly tae.AnyType[] {
  let ordered = pushToEnd(members, 'any');
  ordered = pushToEnd(ordered, 'null');
  ordered = pushToEnd(ordered, 'undefined');
  return ordered;
}

function pushToEnd(members: readonly tae.AnyType[], name: string): readonly tae.AnyType[] {
  const index = members.findIndex(
    (member: tae.AnyType) => member instanceof tae.IntrinsicNode && member.intrinsic === name
  );

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
