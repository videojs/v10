export type ElementPredicate = (element: Element, index: number) => boolean;
export type ElementTypePredicate<T extends Element> = (element: Element, index: number) => element is T;

/** Return direct element children accepted by the predicate. */
export function getElementChildren<T extends Element>(parent: Element, predicate: ElementTypePredicate<T>): T[];
export function getElementChildren(parent: Element, predicate: ElementPredicate): Element[];
export function getElementChildren(parent: Element, predicate: ElementPredicate): Element[] {
  const children: Element[] = [];

  for (let index = 0; index < parent.children.length; index++) {
    const child = parent.children.item(index);
    if (child && predicate(child, index)) children.push(child);
  }

  return children;
}

/** Find the first direct element child accepted by the predicate. */
export function findElementChild<T extends Element>(parent: Element, predicate: ElementTypePredicate<T>): T | null;
export function findElementChild(parent: Element, predicate: ElementPredicate): Element | null;
export function findElementChild(parent: Element, predicate: ElementPredicate): Element | null {
  for (let index = 0; index < parent.children.length; index++) {
    const child = parent.children.item(index);
    if (child && predicate(child, index)) return child;
  }

  return null;
}

/** Follow a single-child relationship from the root until it ends or cycles. */
export function followElementPath<T extends Element>(root: T, getNext: (element: T) => T | null): T[] {
  const path: T[] = [];
  const visited = new Set<T>();
  let current: T | null = root;

  while (current && !visited.has(current)) {
    path.push(current);
    visited.add(current);
    current = getNext(current);
  }

  return path;
}
