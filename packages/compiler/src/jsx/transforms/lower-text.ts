import ts from 'typescript';
import type { CompilerTransform } from '../../config';
import { isJsxElementLike, jsxAttributes, singleJsxChildExpression } from '../../utils/jsx';
import { setJsxAttribute } from '../edits';
import { tagName } from '../matchers/tag';

export interface TranslateTextLowering {
  kind: 'translate';
  /** In-scope translator function called with the descriptor. */
  translator: string;
}

export interface DescriptorTextLowering {
  kind: 'descriptor';
  /** Target attribute populated from the descriptor key. Defaults to `token`. */
  tokenProp?: string | undefined;
}

export interface LowerTextOptions {
  /** Canonical text component tag. Defaults to `Text`. */
  tag?: string | undefined;
  /** Concrete target tag. */
  targetTag: string;
  /** Imported descriptor identifiers recognized by this projection. */
  descriptors: readonly string[];
  lowering: TranslateTextLowering | DescriptorTextLowering;
}

/** Lower configured static Text descriptors while preserving ordinary authored Text children. */
export function lowerText(options: LowerTextOptions): CompilerTransform {
  const sourceTag = options.tag ?? 'Text';
  const descriptors = new Set(options.descriptors);

  return (context) => {
    const factory = context.factory;

    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
      const next = ts.visitEachChild(node, visit, context);
      if (!isJsxElementLike(next) || tagName(next) !== sourceTag) return next;

      const descriptor = ts.isJsxElement(next) ? singleJsxChildExpression(next.children) : null;
      const isDescriptor = descriptor && ts.isIdentifier(descriptor) && descriptors.has(descriptor.text);
      let element = replaceTag(next, options.targetTag, factory);
      if (!isDescriptor) return element;

      if (options.lowering.kind === 'translate') {
        return withChildren(
          element,
          [
            factory.createJsxExpression(
              undefined,
              factory.createCallExpression(factory.createIdentifier(options.lowering.translator), undefined, [
                descriptor,
              ])
            ),
          ],
          factory
        );
      }

      element =
        setJsxAttribute(
          element,
          options.lowering.tokenProp ?? 'token',
          factory.createJsxAttribute(
            factory.createIdentifier(options.lowering.tokenProp ?? 'token'),
            factory.createJsxExpression(
              undefined,
              factory.createPropertyAccessExpression(descriptor, factory.createIdentifier('key'))
            )
          ),
          factory
        ) ?? element;
      return withChildren(
        element,
        [
          factory.createJsxExpression(
            undefined,
            factory.createPropertyAccessExpression(descriptor, factory.createIdentifier('text'))
          ),
        ],
        factory
      );
    };

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}

function replaceTag(element: ts.JsxElement | ts.JsxSelfClosingElement, name: string, factory: ts.NodeFactory) {
  const tag = factory.createIdentifier(name);
  if (ts.isJsxSelfClosingElement(element)) {
    return factory.updateJsxSelfClosingElement(element, tag, element.typeArguments, element.attributes);
  }
  return factory.updateJsxElement(
    element,
    factory.updateJsxOpeningElement(
      element.openingElement,
      tag,
      element.openingElement.typeArguments,
      element.openingElement.attributes
    ),
    element.children,
    factory.updateJsxClosingElement(element.closingElement, tag)
  );
}

function withChildren(
  element: ts.JsxElement | ts.JsxSelfClosingElement,
  children: readonly ts.JsxChild[],
  factory: ts.NodeFactory
): ts.JsxElement {
  const tag = ts.isJsxElement(element) ? element.openingElement.tagName : element.tagName;
  const typeArguments = ts.isJsxElement(element) ? element.openingElement.typeArguments : element.typeArguments;
  return factory.createJsxElement(
    factory.createJsxOpeningElement(tag, typeArguments, jsxAttributes(element)),
    children,
    factory.createJsxClosingElement(tag)
  );
}
