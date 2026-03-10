export const closestComposedNode = <T extends Element = Element>(childNode: Element, selector: string): T | null => {
  if (!childNode) return null;
  const closest = childNode.closest(selector);
  if (closest) return closest as T;
  return closestComposedNode((childNode.getRootNode() as ShadowRoot).host, selector);
};
