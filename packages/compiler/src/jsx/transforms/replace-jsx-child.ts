import ts from 'typescript';
import { isJsxElementLike, type JsxElementLike } from '../../utils/jsx';
import type { Matcher } from '../matchers';

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
