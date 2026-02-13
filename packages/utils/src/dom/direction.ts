/** Check whether an element's text direction is right-to-left. */
export function isRTL(element: Element): boolean {
  const dir = element.closest('[dir]')?.getAttribute('dir');
  if (dir) return dir.toLowerCase() === 'rtl';
  return getComputedStyle(element).direction === 'rtl';
}
