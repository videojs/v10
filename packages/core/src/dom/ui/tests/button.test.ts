import { describe, expect, it, vi } from 'vite-plus/test';

import { applyElementProps } from '../../utils/element-props';
import { createButton } from '../button';

describe('createButton', () => {
  it.each([
    ['pointer', new MouseEvent('click', { bubbles: true, detail: 1 })],
    ['virtual', new MouseEvent('click', { bubbles: true, detail: 0 })],
    ['keyboard', new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })],
    ['keyboard', new KeyboardEvent('keyup', { bubbles: true, key: ' ' })],
  ] as const)('reports %s activation', (source, event) => {
    const element = document.createElement('div');
    const onActivate = vi.fn();

    applyElementProps(element, createButton({ onActivate, isDisabled: () => false }));
    element.dispatchEvent(event);

    expect(onActivate).toHaveBeenCalledWith(event, source);
  });
});
