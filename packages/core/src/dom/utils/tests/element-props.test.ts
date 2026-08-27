import { describe, expect, it } from 'vite-plus/test';

import { applyElementProps } from '../element-props';

describe('applyElementProps', () => {
  it('applies capture event handlers', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    const order: string[] = [];

    parent.append(child);
    applyElementProps(parent, { onKeyDownCapture: () => order.push('parent') });
    child.addEventListener('keydown', () => order.push('child'));
    child.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));

    expect(order).toEqual(['parent', 'child']);
  });

  it('applies pointer capture event handlers', () => {
    const element = document.createElement('div');
    let called = false;

    applyElementProps(element, { onLostPointerCapture: () => (called = true) });
    element.dispatchEvent(new PointerEvent('lostpointercapture'));

    expect(called).toBe(true);
  });
});
