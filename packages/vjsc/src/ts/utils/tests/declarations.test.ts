import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { propertyNameText } from '../declarations';

describe('propertyNameText', () => {
  it('reads static property names', () => {
    expect(propertyNameText(ts.factory.createIdentifier('name'))).toBe('name');
    expect(propertyNameText(ts.factory.createStringLiteral('label'))).toBe('label');
    expect(propertyNameText(ts.factory.createNumericLiteral(2))).toBe('2');
  });

  it('rejects computed and missing property names', () => {
    expect(
      propertyNameText(ts.factory.createComputedPropertyName(ts.factory.createIdentifier('name')))
    ).toBeUndefined();
    expect(propertyNameText(undefined)).toBeUndefined();
  });
});
