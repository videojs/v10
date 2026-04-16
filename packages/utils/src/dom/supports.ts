export function supportsIdleCallback(): boolean {
  return __BROWSER__ && typeof requestIdleCallback === 'function';
}

export function supportsAnimationFrame(): boolean {
  return __BROWSER__ && typeof requestAnimationFrame === 'function';
}

export function supportsAnchorPositioning(): boolean {
  return __BROWSER__ && typeof CSS !== 'undefined' && CSS.supports('anchor-name: --a');
}

export function supportsPopoverAPI(): boolean {
  return __BROWSER__ && typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;
}
