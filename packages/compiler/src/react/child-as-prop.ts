import ts from 'typescript';
import type { JsxElementLike, Matcher } from '../matchers';

export interface ChildAsPropOptions {
  match: Matcher;
  prop: string;
}

/**
 * For elements matching `match`, lift the single JSX-element child into the
 * named prop (turning the element into a self-closing form):
 *
 *   <Tooltip.Trigger><PlayButton/></Tooltip.Trigger>
 *     →  <Tooltip.Trigger render={<PlayButton/>}/>
 *
 * Skips no-op cases:
 *   - element is already self-closing
 *   - prop is already set
 *   - children are zero, multiple, or text-only (no single JSX-element child)
 */
export function childAsProp(opts: ChildAsPropOptions): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const visit = (node: ts.Node): ts.Node => {
      const out = ts.visitEachChild(node, visit, context);
      if (!ts.isJsxElement(out)) return out;
      if (!opts.match(out as JsxElementLike)) return out;

      const opening = out.openingElement;
      if (hasAttribute(opening.attributes, opts.prop)) return out;

      const elementChild = singleElementChild(out.children);
      if (!elementChild) return out;

      const factory = context.factory;
      const newAttrs = factory.createJsxAttributes([
        ...opening.attributes.properties,
        factory.createJsxAttribute(
          factory.createIdentifier(opts.prop),
          factory.createJsxExpression(undefined, elementChild)
        ),
      ]);

      return factory.createJsxSelfClosingElement(opening.tagName, opening.typeArguments, newAttrs);
    };

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}

function hasAttribute(attrs: ts.JsxAttributes, name: string): boolean {
  return attrs.properties.some((p) => ts.isJsxAttribute(p) && ts.isIdentifier(p.name) && p.name.text === name);
}

function singleElementChild(
  children: readonly ts.JsxChild[]
): ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment | null {
  let found: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment | null = null;
  for (const child of children) {
    if (ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces) continue;
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
      if (found) return null;
      found = child;
      continue;
    }
    return null;
  }
  return found;
}
