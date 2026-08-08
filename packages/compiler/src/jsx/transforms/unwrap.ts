import ts from 'typescript';
import { DiagnosticError, diagnosticLocationFromNode } from '../../diagnostics';
import { isJsxElementLike, type JsxElementLike } from '../../utils/jsx';
import type { Matcher } from '../matchers';

export interface UnwrapOptions {
  match: Matcher;
  /** Forward wrapper props to exactly one matching direct child before unwrapping. */
  forwardPropsTo?: Matcher | undefined;
}

/** Remove a matched JSX wrapper while preserving its children in a fragment. */
export function unwrap(options: UnwrapOptions): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const factory = context.factory;

    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
      const next = ts.visitEachChild(node, visit, context);
      if (!isJsxElementLike(next) || !options.match(next)) return next;

      if (!ts.isJsxElement(next)) {
        if (options.forwardPropsTo) throw invalidForwardTarget(next, 0);
        return emptyFragment(factory);
      }

      const children = options.forwardPropsTo ? forwardProps(next, options.forwardPropsTo, factory) : next.children;
      return factory.createJsxFragment(
        factory.createJsxOpeningFragment(),
        children,
        factory.createJsxJsxClosingFragment()
      );
    };

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}

function forwardProps(wrapper: ts.JsxElement, match: Matcher, factory: ts.NodeFactory): readonly ts.JsxChild[] {
  const targets = wrapper.children.filter((child): child is JsxElementLike => isJsxElementLike(child) && match(child));
  if (targets.length !== 1) throw invalidForwardTarget(wrapper, targets.length);

  const target = targets[0]!;
  const wrapperProps = wrapper.openingElement.attributes.properties;
  return wrapper.children.map((child) => {
    if (child !== target) return child;
    const targetProps = ts.isJsxElement(child) ? child.openingElement.attributes : child.attributes;
    const attributes = factory.updateJsxAttributes(targetProps, [...wrapperProps, ...targetProps.properties]);

    if (ts.isJsxElement(child)) {
      return factory.updateJsxElement(
        child,
        factory.updateJsxOpeningElement(
          child.openingElement,
          child.openingElement.tagName,
          child.openingElement.typeArguments,
          attributes
        ),
        child.children,
        child.closingElement
      );
    }

    return factory.updateJsxSelfClosingElement(child, child.tagName, child.typeArguments, attributes);
  });
}

function invalidForwardTarget(wrapper: JsxElementLike, count: number): DiagnosticError {
  return new DiagnosticError(
    `JSX unwrap expected exactly one direct child to receive forwarded props, but found ${count}.`,
    {
      ...diagnosticLocationFromNode(wrapper),
      diagnosticCode: 'jsx-unwrap-forward-target',
    }
  );
}

function emptyFragment(factory: ts.NodeFactory): ts.JsxFragment {
  return factory.createJsxFragment(factory.createJsxOpeningFragment(), [], factory.createJsxJsxClosingFragment());
}
