import { describe, expect, it } from 'vitest';
import { extractCSSVars } from '../css-vars-handler.js';
import { createTestProgram } from './test-utils.js';

describe('extractCSSVars', () => {
  it('extracts from {Name}CSSVars constant', () => {
    const code = `
      export const MockComponentCSSVars = {
        fill: '--media-slider-fill',
        pointer: '--media-slider-pointer',
      } as const;
    `;
    const program = createTestProgram(code);
    const result = extractCSSVars('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.vars).toHaveLength(2);
    expect(result!.vars[0]!.name).toBe('--media-slider-fill');
    expect(result!.vars[1]!.name).toBe('--media-slider-pointer');
  });

  it('extracts JSDoc comments as descriptions', () => {
    const code = `
      export const MockComponentCSSVars = {
        /** Fill level percentage (0-100). */
        fill: '--media-slider-fill',
        /** Pointer position percentage (0-100). */
        pointer: '--media-slider-pointer',
      } as const;
    `;
    const program = createTestProgram(code);
    const result = extractCSSVars('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.vars[0]!.description).toBe('Fill level percentage (0-100).');
    expect(result!.vars[1]!.description).toBe('Pointer position percentage (0-100).');
  });

  it('handles object without as const', () => {
    const code = `
      export const MockComponentCSSVars = {
        fill: '--media-slider-fill',
      };
    `;
    const program = createTestProgram(code);
    const result = extractCSSVars('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.vars).toHaveLength(1);
    expect(result!.vars[0]!.name).toBe('--media-slider-fill');
  });

  it('handles as const satisfies expression', () => {
    const code = `
      export const MockComponentCSSVars = {
        fill: '--media-slider-fill',
      } as const satisfies Record<string, string>;
    `;
    const program = createTestProgram(code);
    const result = extractCSSVars('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.vars).toHaveLength(1);
    expect(result!.vars[0]!.name).toBe('--media-slider-fill');
  });

  it('returns null when constant not found', () => {
    const code = `
      export const OtherConstant = {
        fill: '--media-slider-fill',
      };
    `;
    const program = createTestProgram(code);
    const result = extractCSSVars('test.ts', program, 'MockComponent');

    expect(result).toBeNull();
  });

  it('returns empty description when no JSDoc present', () => {
    const code = `
      export const MockComponentCSSVars = {
        fill: '--media-slider-fill',
      } as const;
    `;
    const program = createTestProgram(code);
    const result = extractCSSVars('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.vars[0]!.description).toBe('');
  });

  it('skips properties with non-string-literal values', () => {
    const code = `
      const PREFIX = '--media-';
      export const MockComponentCSSVars = {
        fill: PREFIX + 'fill',
        pointer: '--media-slider-pointer',
      } as const;
    `;
    const program = createTestProgram(code);
    const result = extractCSSVars('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.vars).toHaveLength(1);
    expect(result!.vars[0]!.name).toBe('--media-slider-pointer');
  });

  it('extracts single-line // comments as descriptions', () => {
    const code = `
      export const MockComponentCSSVars = {
        // Fill level percentage (0-100).
        fill: '--media-slider-fill',
      } as const;
    `;
    const program = createTestProgram(code);
    const result = extractCSSVars('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.vars[0]!.description).toBe('Fill level percentage (0-100).');
  });
});
