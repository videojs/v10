import ts from 'typescript';

/** A JSX element that helpers can transform — either an open/close pair or self-closing. */
export type JsxElementLike = ts.JsxElement | ts.JsxSelfClosingElement;

/** Predicate over a JSX element. Single shape across `replace`, `wrap`, `childAsProp`, `addProp`. */
export type Matcher = (node: JsxElementLike) => boolean;

/** Read the textual tag of a JSX element, including dotted names like `Popover.Root`. */
export function tagName(node: JsxElementLike): string {
  const tagNode = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  return readTag(tagNode);
}

function readTag(name: ts.JsxTagNameExpression): string {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isPropertyAccessExpression(name))
    return `${readTag(name.expression as ts.JsxTagNameExpression)}.${name.name.text}`;
  // ThisExpression / JsxNamespacedName — uncommon in our skins; fall back to source text.
  return name.getText();
}

/**
 * Match a JSX element by tag, with an optional refinement predicate.
 *
 * `byTag('Popover.Root', { when })` matches when the element's tag equals
 * `Popover.Root` AND `when(node)` is true.
 */
export function byTag(tag: string, opts: { when?: Matcher } = {}): Matcher {
  const { when } = opts;
  return (node) => {
    if (tagName(node) !== tag) return false;
    return when ? when(node) : true;
  };
}

/** Match a JSX element if its tag is in the given list. */
export function anyTag(tags: readonly string[]): Matcher {
  const set = new Set(tags);
  return (node) => set.has(tagName(node));
}
