export function supportsIdleCallback(): boolean {
  return typeof requestIdleCallback === 'function';
}

export function supportsAnimationFrame(): boolean {
  return typeof requestAnimationFrame === 'function';
}
