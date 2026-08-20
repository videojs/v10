import ts from 'typescript';
import type { JsxElementLike } from '../utils/jsx';
import {
  jsxAttributes,
  readStringAttribute,
  singleJsxChildExpression,
  singleJsxElementChild,
  updateJsxAttributes,
} from '../utils/jsx';
import { removeJsxAttribute, replaceJsxElementChildren, replaceJsxElementTag, setJsxAttribute } from './edits';

export type JsxElementEdit = (element: JsxElementLike) => JsxElementLike;

export interface ExtractedJsxChild {
  child: JsxElementLike;
  rest: readonly ts.JsxChild[];
}

/** Factory-bound, composable JSX tree reads and edits for rewrite callbacks. */
export function createJsxEditor(factory: ts.NodeFactory) {
  const apply = (element: JsxElementLike, ...edits: readonly JsxElementEdit[]): JsxElementLike =>
    edits.reduce((current, edit) => edit(current), element);

  return {
    apply,
    create: {
      element(tag: string, children: readonly ts.JsxChild[] = []): JsxElementLike {
        const name = factory.createIdentifier(tag);
        const attributes = factory.createJsxAttributes([]);
        return children.length === 0
          ? factory.createJsxSelfClosingElement(name, undefined, attributes)
          : factory.createJsxElement(
              factory.createJsxOpeningElement(name, undefined, attributes),
              children,
              factory.createJsxClosingElement(name)
            );
      },
      expression(value: ts.Expression): ts.JsxExpression {
        return factory.createJsxExpression(undefined, value);
      },
    },
    tag: {
      name(element: JsxElementLike): string {
        return ts.isJsxElement(element) ? element.openingElement.tagName.getText() : element.tagName.getText();
      },
      replace(tag: string): JsxElementEdit {
        return (element) => replaceJsxElementTag(element, factory.createIdentifier(tag), factory);
      },
    },
    props: {
      staticString(element: JsxElementLike, name: string): string | null | undefined {
        return readStringAttribute(jsxAttributes(element), name);
      },
      remove(name: string): JsxElementEdit {
        return (element) => removeJsxAttribute(element, name, factory);
      },
      set(name: string, value?: string | ts.Expression): JsxElementEdit {
        return (element) =>
          setJsxAttribute(
            element,
            name,
            factory.createJsxAttribute(
              factory.createIdentifier(name),
              typeof value === 'string'
                ? factory.createStringLiteral(value)
                : value
                  ? factory.createJsxExpression(undefined, value)
                  : undefined
            ),
            factory
          ) ?? element;
      },
      spread(value: ts.Expression, position: 'start' | 'end' = 'end'): JsxElementEdit {
        return (element) => {
          const attributes = jsxAttributes(element);
          const spread = factory.createJsxSpreadAttribute(value);
          const properties =
            position === 'start' ? [spread, ...attributes.properties] : [...attributes.properties, spread];
          return updateJsxAttributes(element, factory.updateJsxAttributes(attributes, properties), factory);
        };
      },
    },
    children: {
      extractOne(element: JsxElementLike, matches: (child: JsxElementLike) => boolean): ExtractedJsxChild | undefined {
        if (!ts.isJsxElement(element)) return undefined;
        const found = element.children.filter(
          (child): child is JsxElementLike =>
            (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) && matches(child)
        );
        if (found.length === 0) return undefined;
        if (found.length > 1)
          throw new Error(`Expected at most one matching JSX child in <${thisTag(element)}>`.trim());
        const child = found[0]!;
        return {
          child,
          rest: element.children.filter(
            (candidate) => candidate !== child && (!ts.isJsxText(candidate) || candidate.text.trim().length > 0)
          ),
        };
      },
      onlyElement(element: JsxElementLike): JsxElementLike {
        if (!ts.isJsxElement(element)) throw new Error(`<${thisTag(element)}> must contain one JSX element child.`);
        const child = singleJsxElementChild(element.children);
        if (!child || ts.isJsxFragment(child)) {
          throw new Error(`<${thisTag(element)}> must contain one JSX element child.`);
        }
        return child;
      },
      singleExpression(element: JsxElementLike): ts.Expression | undefined {
        return ts.isJsxElement(element) ? (singleJsxChildExpression(element.children) ?? undefined) : undefined;
      },
      set(children: readonly ts.JsxChild[]): JsxElementEdit {
        return (element) => replaceJsxElementChildren(element, children, factory);
      },
      replace(child: ts.JsxChild, replacement: ts.JsxChild): JsxElementEdit {
        return (element) =>
          replaceJsxElementChildren(
            element,
            ts.isJsxElement(element)
              ? element.children.map((candidate) => (candidate === child ? replacement : candidate))
              : [],
            factory
          );
      },
    },
    selfCloseIfEmpty(): JsxElementEdit {
      return (element) =>
        replaceJsxElementChildren(element, ts.isJsxElement(element) ? element.children : [], factory, {
          selfClosingWhenEmpty: true,
        });
    },
  };
}

function thisTag(element: JsxElementLike): string {
  return ts.isJsxElement(element) ? element.openingElement.tagName.getText() : element.tagName.getText();
}
