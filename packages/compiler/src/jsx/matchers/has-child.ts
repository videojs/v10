import ts from 'typescript';
import type { JsxElementLike, Matcher } from './tag';

export interface HasChildOptions {
  /** When `true`, search all descendants (not just direct children). Default: `false`. */
  deep?: boolean;
}

/**
 * Match a JSX element that has any child satisfying `childMatcher`.
 *
 * Composes with `byTag` / `anyTag` for nested shape checks:
 *
 *   // Popover.Root whose Popover.Trigger child contains a MuteButton:
 *   byTag('Popover.Root', {
 *     when: hasChild(byTag('Popover.Trigger', { when: hasChild(byTag('MuteButton')) })),
 *   })
 *
 * Self-closing elements have no children and never match. Whitespace-only
 * `JsxText` nodes are skipped. With `deep: true`, descendants of every
 * JsxElement are searched recursively.
 */
export function hasChild(childMatcher: Matcher, opts: HasChildOptions = {}): Matcher {
  const { deep = false } = opts;
  return (node) => {
    if (!ts.isJsxElement(node)) return false;
    return findIn(node.children, childMatcher, deep);
  };
}

function findIn(children: readonly ts.JsxChild[], match: Matcher, deep: boolean): boolean {
  for (const child of children) {
    if (ts.isJsxText(child)) continue;
    if (ts.isJsxFragment(child)) {
      if (deep && findIn(child.children, match, deep)) return true;
      continue;
    }
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      if (match(child as JsxElementLike)) return true;
      if (deep && ts.isJsxElement(child) && findIn(child.children, match, deep)) return true;
    }
  }
  return false;
}
