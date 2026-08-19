import { isObject } from '@videojs/utils/predicate';
import ts from 'typescript';

import type { CompilerPlugin, CompilerTransform } from '../config';
import type { JsxElementLike } from '../jsx';
import { isJsxElementLike, readJsxAttributeExpression } from '../utils/jsx';

export function readJsxElement(value: unknown, context: unknown): JsxElementLike | undefined {
  if (isNode(value) && isJsxElementLike(value)) return value;

  if (isObject(context) && 'element' in context && isNode(context.element) && isJsxElementLike(context.element)) {
    return context.element;
  }

  return undefined;
}

export function readJsxProp(value: unknown, context: unknown): ts.JsxAttribute | undefined {
  if (isJsxProp(value)) return value;
  if (isObject(context) && 'prop' in context && isJsxProp(context.prop)) return context.prop;

  return undefined;
}

export function readJsxPropValue(value: unknown, context: unknown): ts.Expression | undefined {
  if (isObject(context) && 'value' in context && isNode(context.value) && ts.isExpression(context.value)) {
    return context.value;
  }

  const prop = readJsxProp(value, context);

  return prop ? readJsxAttributeExpression(prop) : undefined;
}

export function readInterface(value: unknown, context: unknown): ts.InterfaceDeclaration | undefined {
  if (isNode(value) && ts.isInterfaceDeclaration(value)) return value;

  if (
    isObject(context) &&
    'interface' in context &&
    isNode(context.interface) &&
    ts.isInterfaceDeclaration(context.interface)
  ) {
    return context.interface;
  }

  return undefined;
}

export function readInterfaceProperty(value: unknown, context: unknown): ts.PropertySignature | undefined {
  if (isNode(value) && ts.isPropertySignature(value)) return value;

  if (
    isObject(context) &&
    'property' in context &&
    isNode(context.property) &&
    ts.isPropertySignature(context.property)
  ) {
    return context.property;
  }

  return undefined;
}

export function readFunctionDeclaration(value: unknown, context: unknown): ts.FunctionDeclaration | undefined {
  if (isNode(value) && ts.isFunctionDeclaration(value)) return value;

  if (
    isObject(context) &&
    'function' in context &&
    isNode(context.function) &&
    ts.isFunctionDeclaration(context.function)
  ) {
    return context.function;
  }

  return undefined;
}

export function isCompilerPlugin(value: CompilerTransform | CompilerPlugin): value is CompilerPlugin {
  return isObject(value) && 'name' in value && typeof value.name === 'string';
}

export function isNode(value: unknown): value is ts.Node {
  return isObject(value) && 'kind' in value && typeof value.kind === 'number';
}

function isJsxProp(value: unknown): value is ts.JsxAttribute {
  return isNode(value) && ts.isJsxAttribute(value);
}
