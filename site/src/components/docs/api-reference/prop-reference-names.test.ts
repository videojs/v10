import { describe, expect, it } from 'vitest';
import { getPropReferenceNames } from './prop-reference-names';

describe('getPropReferenceNames', () => {
  it('maps an overridden HTML attribute without changing the React prop', () => {
    expect(getPropReferenceNames('title', 'content-title', true)).toEqual({
      propertyName: 'contentTitle',
      attributeName: 'content-title',
    });
    expect(getPropReferenceNames('title', 'content-title', false)).toEqual({
      propertyName: 'title',
      attributeName: undefined,
    });
  });
});
