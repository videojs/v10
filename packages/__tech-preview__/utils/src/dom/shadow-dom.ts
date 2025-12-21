/**
 * Utility function to check if a root node contains a child node across shadow DOM boundaries.
 */
export function containsComposedNode(rootNode: Node, childNode: Node): boolean {
  if (!rootNode || !childNode) return false;
  if (rootNode?.contains(childNode)) return true;
  const childRootNode = childNode.getRootNode();
  if (childRootNode && 'host' in childRootNode && childRootNode.host) {
    return containsComposedNode(rootNode, childRootNode.host as Node);
  }
  return false;
}
