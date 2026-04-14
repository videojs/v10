import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { GestureElement } from '../gesture-element';

beforeAll(() => {
  customElements.define('media-gesture', GestureElement);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('GestureElement', () => {
  it('has the correct tag name', () => {
    expect(GestureElement.tagName).toBe('media-gesture');
  });

  it('declares expected properties', () => {
    const props = GestureElement.properties;
    expect(props).toHaveProperty('type');
    expect(props).toHaveProperty('action');
    expect(props).toHaveProperty('value');
    expect(props).toHaveProperty('pointer');
    expect(props).toHaveProperty('region');
    expect(props).toHaveProperty('disabled');
  });

  it('initializes with default property values', () => {
    const el = document.createElement('media-gesture') as GestureElement;
    expect(el.type).toBe('');
    expect(el.action).toBe('');
    expect(el.value).toBeUndefined();
    expect(el.pointer).toBeUndefined();
    expect(el.region).toBeUndefined();
    expect(el.disabled).toBe(false);
  });

  it('is hidden when connected', () => {
    const el = document.createElement('media-gesture') as GestureElement;
    document.body.appendChild(el);
    expect(el.style.display).toBe('none');
  });
});
