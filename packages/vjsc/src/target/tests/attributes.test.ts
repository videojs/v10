import { describe, expect, it } from 'vite-plus/test';

import { htmlAttributeName } from '../attributes';

describe('htmlAttributeName', () => {
  it('maps HTML and namespaced JSX aliases', () => {
    expect(htmlAttributeName('className')).toBe('class');
    expect(htmlAttributeName('htmlFor')).toBe('for');
    expect(htmlAttributeName('xlinkHref')).toBe('xlink:href');
  });

  it('preserves case-sensitive SVG names while kebab-casing presentation attributes', () => {
    expect(htmlAttributeName('viewBox')).toBe('viewBox');
    expect(htmlAttributeName('preserveAspectRatio')).toBe('preserveAspectRatio');
    expect(htmlAttributeName('strokeWidth')).toBe('stroke-width');
  });
});
