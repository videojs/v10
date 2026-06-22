import ts from 'typescript';
import type { JsxElementLike } from '../jsx';

/**
 * A single segment within a `className` attribute. Either a literal class
 * string we can statically analyze, a dotted token reference (e.g.
 * `styles.button.icon`) we can resolve later, or an opaque expression we
 * have to leave alone.
 */
export type StyleSegment =
  | { kind: 'literal'; value: string; node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral }
  | { kind: 'token'; path: readonly string[]; node: ts.PropertyAccessExpression | ts.Identifier }
  | { kind: 'opaque'; node: ts.Expression };

/**
 * The `className` attribute on a JSX element, plus everything the visitor
 * needs to inspect or rewrite it. Two shapes:
 *
 *   - `kind: 'segments'` — the value is a literal string, className array, or
 *     single dotted token reference. We can decompose it into ordered
 *     `StyleSegment`s.
 *   - `kind: 'opaque'` — anything else (computed expressions, ternaries that
 *     don't reduce, function calls). Visitors should pass.
 */
export type StyleAttributeInfo = StyleAttributeSegmentsInfo | StyleAttributeOpaqueInfo;

export interface StyleAttributeBaseInfo {
  /** The element this className lives on. */
  element: JsxElementLike;
  /** The JSX attribute node, for source-location reporting. */
  attribute: ts.JsxAttribute;
  /** The expression *inside* the attribute (the `className={…}` payload). */
  expression: ts.Expression;
}

export interface StyleAttributeSegmentsInfo extends StyleAttributeBaseInfo {
  /** Decomposition. */
  kind: 'segments';
  segments: readonly StyleSegment[];
}

export interface StyleAttributeOpaqueInfo extends StyleAttributeBaseInfo {
  kind: 'opaque';
}

/**
 * Visitor return type:
 *   - `undefined` — leave the attribute unchanged.
 *   - a `ts.Expression` — replace the attribute's value with this.
 */
export type StyleVisitorResult = ts.Expression | undefined;

/** The visitor invoked for each `className` attribute. */
export type StyleVisitor = (info: StyleAttributeInfo, factory: ts.NodeFactory) => StyleVisitorResult;

export interface AnalyzeStylesOptions {
  visit: StyleVisitor;
}

/**
 * TS transformer that walks every JSX `className` attribute and invokes a
 * visitor with structural info. The visitor decides whether to replace the
 * attribute's value (returning a new expression) or leave it alone.
 *
 * The visitor is purely structural — it does not know about Tailwind or
 * any other style system. Higher-level plugins (e.g. `tailwindPlugin`)
 * compose it.
 */
export function analyzeStyles(options: AnalyzeStylesOptions): ts.TransformerFactory<ts.SourceFile> {
  const { visit } = options;

  return (transformContext) => {
    const factory = transformContext.factory;

    return (sourceFile) => {
      const visitNode = (node: ts.Node): ts.Node => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const visited = visitJsxElement(node as JsxElementLike, factory, visit, transformContext);
          // Continue descending into the (possibly transformed) element.
          return ts.visitEachChild(visited, visitNode, transformContext);
        }
        return ts.visitEachChild(node, visitNode, transformContext);
      };

      return ts.visitEachChild(sourceFile, visitNode, transformContext);
    };
  };
}

function visitJsxElement(
  element: JsxElementLike,
  factory: ts.NodeFactory,
  visit: StyleVisitor,
  context: ts.TransformationContext
): JsxElementLike {
  const attrs = ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
  const classNameAttr = findClassNameAttribute(attrs);
  if (!classNameAttr) return element;

  const expression = readAttributeExpression(classNameAttr);
  if (!expression) return element;

  const info: StyleAttributeInfo = decompose(element, classNameAttr, expression);

  const replacement = visit(info, factory);
  if (replacement === undefined) return element;

  return rewriteAttribute(element, classNameAttr, replacement, factory, context);
}

function findClassNameAttribute(attrs: ts.JsxAttributes): ts.JsxAttribute | undefined {
  for (const prop of attrs.properties) {
    if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name) && prop.name.text === 'className') {
      return prop;
    }
  }
  return undefined;
}

function readAttributeExpression(attr: ts.JsxAttribute): ts.Expression | undefined {
  const init = attr.initializer;
  if (!init) return undefined;
  if (ts.isStringLiteral(init)) return init;
  if (ts.isJsxExpression(init) && init.expression) return init.expression;
  return undefined;
}

function decompose(element: JsxElementLike, attribute: ts.JsxAttribute, expression: ts.Expression): StyleAttributeInfo {
  // Literal string: `className="foo bar"` or `className={'foo bar'}`.
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return {
      element,
      attribute,
      expression,
      kind: 'segments',
      segments: [{ kind: 'literal', value: expression.text, node: expression }],
    };
  }

  // Single dotted token reference: `className={styles.button.icon}`.
  if (ts.isPropertyAccessExpression(expression) || ts.isIdentifier(expression)) {
    const path = readDottedPath(expression);
    if (path) {
      return {
        element,
        attribute,
        expression,
        kind: 'segments',
        segments: [{ kind: 'token', path, node: expression }],
      };
    }
  }

  // Array literal: decompose each element.
  if (ts.isArrayLiteralExpression(expression)) {
    const segments: StyleSegment[] = [];
    for (const item of expression.elements) {
      if (ts.isSpreadElement(item)) return { element, attribute, expression, kind: 'opaque' };
      segments.push(classifySegment(item));
    }
    return {
      element,
      attribute,
      expression,
      kind: 'segments',
      segments,
    };
  }

  // Anything else (ternaries, function calls, conditional spreads, …)
  return { element, attribute, expression, kind: 'opaque' };
}

function classifySegment(arg: ts.Expression): StyleSegment {
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
    return { kind: 'literal', value: arg.text, node: arg };
  }
  if (ts.isPropertyAccessExpression(arg) || ts.isIdentifier(arg)) {
    const path = readDottedPath(arg);
    if (path) return { kind: 'token', path, node: arg };
  }
  return { kind: 'opaque', node: arg };
}

/**
 * Read a dotted path like `styles.button.icon` into `['styles', 'button', 'icon']`.
 * Returns `null` for any non-dotted expression (e.g. element access, computed property).
 */
function readDottedPath(expr: ts.Expression): readonly string[] | null {
  if (ts.isIdentifier(expr)) return [expr.text];
  if (ts.isPropertyAccessExpression(expr)) {
    const head = readDottedPath(expr.expression);
    if (!head) return null;
    if (!ts.isIdentifier(expr.name)) return null;
    return [...head, expr.name.text];
  }
  return null;
}

function rewriteAttribute(
  element: JsxElementLike,
  attribute: ts.JsxAttribute,
  replacement: ts.Expression,
  factory: ts.NodeFactory,
  _context: ts.TransformationContext
): JsxElementLike {
  const newAttribute = factory.updateJsxAttribute(
    attribute,
    attribute.name,
    ts.isStringLiteral(replacement) ? replacement : factory.createJsxExpression(undefined, replacement)
  );

  if (ts.isJsxElement(element)) {
    const opening = element.openingElement;
    const newAttrs = factory.updateJsxAttributes(
      opening.attributes,
      opening.attributes.properties.map((p) => (p === attribute ? newAttribute : p))
    );
    const newOpening = factory.updateJsxOpeningElement(opening, opening.tagName, opening.typeArguments, newAttrs);
    return factory.updateJsxElement(element, newOpening, element.children, element.closingElement);
  }

  // Self-closing element.
  const newAttrs = factory.updateJsxAttributes(
    element.attributes,
    element.attributes.properties.map((p) => (p === attribute ? newAttribute : p))
  );
  return factory.updateJsxSelfClosingElement(element, element.tagName, element.typeArguments, newAttrs);
}
