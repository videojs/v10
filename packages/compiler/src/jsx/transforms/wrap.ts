import ts from 'typescript';
import { type AddImportContext, addNamedImport } from '../../transforms/add-import';
import type { ImportRef } from '../../transforms/imports';
import type { JsxElementLike, Matcher } from '../matchers';

export interface WrapOptions {
  match: Matcher;
  with: ImportRef;
}

/**
 * Wrap a matched JSX subtree with another component:
 *   <Match/> -> <Wrapper><Match/></Wrapper>
 * The wrapper's import is added if missing.
 */
export function wrap(opts: WrapOptions, ctx: AddImportContext = {}): ts.TransformerFactory<ts.SourceFile> {
  return (transformContext) => {
    return (sourceFile) => {
      const factory = transformContext.factory;
      let didWrap = false;

      const visit = (node: ts.Node): ts.Node => {
        if ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && opts.match(node as JsxElementLike)) {
          didWrap = true;
          const tag = factory.createIdentifier(opts.with.name);
          const inner = ts.visitEachChild(node, visit, transformContext) as ts.JsxChild;
          return factory.createJsxElement(
            factory.createJsxOpeningElement(tag, undefined, factory.createJsxAttributes([])),
            [inner],
            factory.createJsxClosingElement(tag)
          );
        }
        return ts.visitEachChild(node, visit, transformContext);
      };

      let result = ts.visitEachChild(sourceFile, visit, transformContext);
      if (didWrap) result = addNamedImport(result, opts.with, factory, ctx);
      return result;
    };
  };
}
