export function isSliderFocused(root: Document = document): boolean {
  return root.activeElement?.getAttribute('role') === 'slider';
}
