import { isShadowRoot } from './predicates';

export function containsComposed(root: Element, element: Element): boolean {
  let current: Node | null = element;

  while (current) {
    if (current === root || root.contains(current)) return true;

    const nodeRoot = current.getRootNode();
    current = isShadowRoot(nodeRoot) ? nodeRoot.host : current.parentNode;
  }

  return false;
}
