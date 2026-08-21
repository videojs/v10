import { describe, expect, it } from 'vitest';

import { createDeclaration } from '../declaration';

describe('createDeclaration', () => {
  it('generates an isolated declaration module', () => {
    expect(createDeclaration('export const value: string = "value";', '/source/module.ts')).toBe(
      'export declare const value: string;\n'
    );
  });
});
