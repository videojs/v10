import { isFunction, isUndefined } from '../predicate';
export function supportsIdleCallback(): boolean {
  return isFunction(globalThis.requestIdleCallback);
}

export function supportsAnimationFrame(): boolean {
  return isFunction(globalThis.requestAnimationFrame);
}

export function supportsAnchorPositioning(): boolean {
  return !isUndefined(globalThis.CSS) && globalThis.CSS.supports('anchor-name: --a');
}

export function supportsPopoverAPI(): boolean {
  return !isUndefined(globalThis.HTMLElement) && 'popover' in globalThis.HTMLElement.prototype;
}
