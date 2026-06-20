import { isString } from '@videojs/utils/predicate';
import ts from 'typescript';
import type { JsxElementLike, Matcher } from '../matchers';

const IDENTIFIER_NAME_RE = /^[$A-Z_a-z][$\w]*$/;

export type JsxChildReplacement = ts.JsxChild | readonly ts.JsxChild[];

export interface ReplaceJsxChildOptions {
  match: Matcher;
  replace: (node: JsxElementLike, factory: ts.NodeFactory) => JsxChildReplacement | undefined;
}

export function replaceJsxChild(options: ReplaceJsxChildOptions): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const visit: ts.Visitor = (node) => {
      if (isJsxElementLike(node) && options.match(node)) {
        const replacement = options.replace(node, context.factory);
        return replacement ?? node;
      }

      return ts.visitEachChild(node, visit, context);
    };

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}

export function jsxExpression(factory: ts.NodeFactory, expression: ts.Expression): ts.JsxExpression {
  return factory.createJsxExpression(undefined, expression);
}

export function accessPath(
  factory: ts.NodeFactory,
  root: string | ts.Expression,
  ...path: readonly string[]
): ts.Expression {
  let expression = isString(root) ? factory.createIdentifier(root) : root;

  for (const property of path) {
    expression = propertyAccess(factory, expression, property);
  }

  return expression;
}

export function propertyAccess(factory: ts.NodeFactory, expression: ts.Expression, property: string): ts.Expression {
  if (IDENTIFIER_NAME_RE.test(property)) {
    return factory.createPropertyAccessExpression(expression, property);
  }

  return factory.createElementAccessExpression(expression, factory.createStringLiteral(property));
}

export function readStringAttribute(attributes: ts.JsxAttributes, name: string): string | null | undefined {
  const attr = attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name
  );

  if (!attr || !ts.isJsxAttribute(attr)) return undefined;

  const init = attr.initializer;
  if (!init) return '';
  if (ts.isStringLiteral(init)) return init.text;
  if (ts.isJsxExpression(init) && init.expression) {
    if (ts.isStringLiteral(init.expression) || ts.isNoSubstitutionTemplateLiteral(init.expression)) {
      return init.expression.text;
    }
  }
  return null;
}

function isJsxElementLike(node: ts.Node): node is JsxElementLike {
  return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);
}
