import ts from 'typescript';
import { type AddImportContext, addNamedImport } from '../../transforms/add-import';
import type { ImportRef } from '../../transforms/imports';
import { isJsxElementLike } from '../../utils/jsx';
import { replaceJsxElementTag } from '../edits';
import type { JsxElementLike, Matcher } from '../matchers';

export interface ReplaceOptions {
  match: Matcher;
  with: ImportRef;
  /** Reshape the new element's attributes from the original's. Defaults to passthrough. */
  mapProps?: (original: ts.JsxAttributes, factory: ts.NodeFactory) => ts.JsxAttributes;
  /** Reshape the new element's children from the original's. Defaults to passthrough (open form only). */
  mapChildren?: (originalChildren: readonly ts.JsxChild[], factory: ts.NodeFactory) => readonly ts.JsxChild[];
}

/**
 * Substitute a matched JSX element with a different element drawn from a
 * different import. The new tag's import is added if missing.
 *
 * `mapProps` and `mapChildren` default to identity (props pass through;
 * children pass through when the original is an open element). Self-closing
 * matches always emit a self-closing replacement when `mapChildren` is not
 * provided.
 */
export function replace(opts: ReplaceOptions, ctx: AddImportContext = {}): ts.TransformerFactory<ts.SourceFile> {
  return (transformContext) => {
    return (sourceFile) => {
      const factory = transformContext.factory;
      let didReplace = false;

      const visit = (node: ts.Node): ts.Node => {
        if (isJsxElementLike(node) && opts.match(node)) {
          didReplace = true;
          return buildReplacement(node, opts, factory);
        }
        return ts.visitEachChild(node, visit, transformContext);
      };

      let result = ts.visitEachChild(sourceFile, visit, transformContext);
      if (didReplace) result = addNamedImport(result, opts.with, factory, ctx);
      return result;
    };
  };
}

function buildReplacement(
  node: JsxElementLike,
  opts: ReplaceOptions,
  factory: ts.NodeFactory
): ts.JsxElement | ts.JsxSelfClosingElement {
  const newTag = factory.createIdentifier(opts.with.name);
  const originalAttrs = ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes;
  const originalChildren = ts.isJsxElement(node) ? node.children : ([] as readonly ts.JsxChild[]);
  return replaceJsxElementTag(node, newTag, factory, {
    ...(opts.mapProps ? { attributes: opts.mapProps(originalAttrs, factory) } : {}),
    ...(opts.mapChildren ? { children: opts.mapChildren(originalChildren, factory) } : {}),
    preserveTypeArguments: false,
  });
}
