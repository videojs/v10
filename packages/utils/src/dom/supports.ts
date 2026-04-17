export function supportsIdleCallback(): boolean {
  return typeof requestIdleCallback === 'function';
}

export function supportsAnimationFrame(): boolean {
  return typeof requestAnimationFrame === 'function';
}

export function supportsAnchorPositioning(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('anchor-name: --a');
}

export function supportsPopoverAPI(): boolean {
  return typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;
}
