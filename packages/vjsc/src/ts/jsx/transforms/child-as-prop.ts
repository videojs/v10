import ts from 'typescript';
import { moveJsxChildToProp } from '../edits';
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

      return moveJsxChildToProp(out, opts.prop, context.factory) ?? out;
    };

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}
