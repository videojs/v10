import ts from 'typescript';
import { hasJsxAttribute, singleJsxChildExpression } from '../../utils/jsx';
import type { JsxElementLike, Matcher } from '../matchers';

export interface ChildAsPropOptions {
  match: Matcher;
  prop: string;
}

/**
 * For elements matching `match`, lift the single JSX element or expression child into the
 * named prop (turning the element into a self-closing form):
 *
 *   <Parent.Trigger><Child/></Parent.Trigger>
 *     -> <Parent.Trigger render={<Child/>}/>
 *
 * Skips no-op cases:
 *   - element is already self-closing
 *   - prop is already set
 *   - children are zero, multiple, or text-only
 */
export function childAsProp(opts: ChildAsPropOptions): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const visit = (node: ts.Node): ts.Node => {
      const out = ts.visitEachChild(node, visit, context);
      if (!ts.isJsxElement(out)) return out;
      if (!opts.match(out as JsxElementLike)) return out;

      const opening = out.openingElement;
      if (hasJsxAttribute(opening.attributes, opts.prop)) return out;

      const child = singleJsxChildExpression(out.children);
      if (!child) return out;

      const factory = context.factory;
      const newAttrs = factory.createJsxAttributes([
        ...opening.attributes.properties,
        factory.createJsxAttribute(factory.createIdentifier(opts.prop), factory.createJsxExpression(undefined, child)),
      ]);

      return factory.createJsxSelfClosingElement(opening.tagName, opening.typeArguments, newAttrs);
    };

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}
