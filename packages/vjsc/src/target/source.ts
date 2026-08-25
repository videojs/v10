import type { JSXAttribute, JSXOpeningElement } from '@oxc-project/types';
import { isString } from '@videojs/utils/predicate';

import { createSourceText, renderSourceRange, type SourceText } from '../ast';
import type { SourceProps } from './definition';

export const SOURCE_PROPS = Symbol('vjsc/source-props');
export const SOURCE_PROP = Symbol('vjsc/source-prop');
export const SOURCE_CHILDREN = Symbol('vjsc/source-children');

export interface SourcePropsToken {
  readonly [SOURCE_PROPS]: true;
  readonly source: SourceText;
  readonly attributes: JSXOpeningElement['attributes'];
  readonly omitted: ReadonlySet<string>;
}

export interface SourcePropToken {
  readonly [SOURCE_PROP]: true;
  readonly source: SourceText;
  readonly name: string;
  readonly attribute: JSXAttribute | undefined;
}

export interface SourceChildrenToken {
  readonly [SOURCE_CHILDREN]: true;
  readonly source: SourceText;
  readonly value: string;
  readonly rootOpeningEnd?: number | undefined;
}

export function createSourceProps<Props extends object>(
  source: string | SourceText,
  opening: JSXOpeningElement,
  children: SourceChildrenToken,
  omitted: ReadonlySet<string> = new Set()
): SourceProps<Props> {
  return createSourcePropsFromAttributes(normalizeSourceText(source), opening.attributes, children, omitted);
}

function createSourcePropsFromAttributes<Props extends object>(
  source: SourceText,
  attributes: JSXOpeningElement['attributes'],
  children: SourceChildrenToken,
  omitted: ReadonlySet<string>
): SourceProps<Props> {
  const token: SourcePropsToken = { [SOURCE_PROPS]: true, source, attributes, omitted };

  return new Proxy(
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ Object.create(
      null
    ) as SourceProps<Props>,
    {
      get(_target, property) {
        if (property === SOURCE_PROPS) return token;
        if (property === 'has') return (name: string) => findAttribute(attributes, name) !== undefined;
        if (property === 'get') return (name: string) => createSourceProp(source, attributes, name, children);
        if (property === 'omit') {
          return (...names: string[]) =>
            createSourcePropsFromAttributes<Props>(source, attributes, children, new Set([...omitted, ...names]));
        }
        if (property === 'merge') {
          return (other: SourceProps<object>) => {
            const otherSource =
              /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
                other as SourceProps<object> & { readonly [SOURCE_PROPS]?: SourcePropsToken }
              )[SOURCE_PROPS];
            if (!otherSource || otherSource.source.code !== token.source.code)
              throw new Error('vjsc/target: source props can only merge within one module.');
            return createSourcePropsFromAttributes<Props & object>(
              token.source,
              [...attributes, ...otherSource.attributes],
              children,
              new Set([...omitted, ...otherSource.omitted])
            );
          };
        }
        if (property === 'children') return children;
        if (isString(property)) return createSourceProp(source, attributes, property, children);
        return undefined;
      },
      ownKeys() {
        return [SOURCE_PROPS];
      },
      getOwnPropertyDescriptor(_target, property) {
        return property === SOURCE_PROPS
          ? { configurable: true, enumerable: true, value: token, writable: false }
          : undefined;
      },
    }
  );
}

export function createSourceChildren(
  source: string | SourceText,
  opening: JSXOpeningElement,
  closingStart: number,
  rootOpening?: JSXOpeningElement
): SourceChildrenToken {
  const normalized = normalizeSourceText(source);
  const rendered = renderSourceRange(normalized, opening.end, closingStart);
  const rootOpeningEnd = rootOpening ? rendered.position(rootOpening.end) : undefined;

  const children = {
    [SOURCE_CHILDREN]: true,
    source: normalized,
    value: rendered.value,
  } satisfies {
    [SOURCE_CHILDREN]: true;
    source: SourceText;
    value: string;
    rootOpeningEnd?: number;
  };
  if (rootOpeningEnd !== undefined) Object.assign(children, { rootOpeningEnd });
  return children;
}

export function isSourcePropsToken<Value>(value: Value): value is Value & SourcePropsToken {
  return Boolean(
    value &&
    typeof value === 'object' &&
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
      value as Partial<SourcePropsToken>
    )[SOURCE_PROPS] === true
  );
}

export function isSourcePropToken<Value>(value: Value): value is Value & SourcePropToken {
  return Boolean(
    value &&
    typeof value === 'object' &&
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
      value as Partial<SourcePropToken>
    )[SOURCE_PROP] === true
  );
}

export function isSourceChildrenToken<Value>(value: Value): value is Value & SourceChildrenToken {
  return Boolean(
    value &&
    typeof value === 'object' &&
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
      value as Partial<SourceChildrenToken>
    )[SOURCE_CHILDREN] === true
  );
}

function createSourceProp(
  source: SourceText,
  attributes: JSXOpeningElement['attributes'],
  name: string,
  children: SourceChildrenToken
): SourcePropToken | SourceChildrenToken {
  if (name === 'children') return children;

  return {
    [SOURCE_PROP]: true,
    source,
    name,
    attribute: findAttribute(attributes, name),
  };
}

function normalizeSourceText(source: string | SourceText): SourceText {
  return isString(source) ? createSourceText(source) : source;
}

function findAttribute(attributes: JSXOpeningElement['attributes'], name: string): JSXAttribute | undefined {
  return attributes.find(
    (attribute): attribute is JSXAttribute =>
      attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && attribute.name.name === name
  );
}
