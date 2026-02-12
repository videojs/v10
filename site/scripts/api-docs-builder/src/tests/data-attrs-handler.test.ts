import { describe, expect, it } from 'vitest';
import { extractDataAttrs } from '../data-attrs-handler.js';
import { createTestProgram } from './test-utils.js';

describe('extractDataAttrs', () => {
  it('extracts from {Name}DataAttrs constant', () => {
    const code = `
      export const MockComponentDataAttrs = {
        active: 'data-active',
        disabled: 'data-disabled',
      } as const;
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs).toHaveLength(2);
    expect(result!.attrs[0]!.name).toBe('data-active');
    expect(result!.attrs[1]!.name).toBe('data-disabled');
  });

  it('extracts from {Name}DataAttributes constant (alternate naming)', () => {
    const code = `
      export const MockComponentDataAttributes = {
        paused: 'data-paused',
      } as const;
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs).toHaveLength(1);
    expect(result!.attrs[0]!.name).toBe('data-paused');
  });

  it('extracts JSDoc comments for each property', () => {
    const code = `
      export const MockComponentDataAttrs = {
        /** Present when the component is active. */
        active: 'data-active',
        /** Present when the component is disabled. */
        disabled: 'data-disabled',
      } as const;
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.description).toBe('Present when the component is active.');
    expect(result!.attrs[1]!.description).toBe('Present when the component is disabled.');
  });

  it('handles object without as const', () => {
    const code = `
      export const MockComponentDataAttrs = {
        value: 'data-value',
      };
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs).toHaveLength(1);
  });

  it('extracts from {Name}DataAttrs with as const satisfies', () => {
    const code = `
      type StateAttrMap<State> = { [Key in keyof State]?: string };
      interface MockComponentState {
        active: boolean;
      }

      export const MockComponentDataAttrs = {
        active: 'data-active',
      } as const satisfies StateAttrMap<MockComponentState>;
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs).toHaveLength(1);
    expect(result!.attrs[0]!.name).toBe('data-active');
  });

  it('extracts from {Name}DataAttrs with satisfies expression', () => {
    const code = `
      export const MockComponentDataAttrs = ({
        active: 'data-active',
      }) satisfies Record<string, string>;
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs).toHaveLength(1);
    expect(result!.attrs[0]!.name).toBe('data-active');
  });

  it('extracts JSDoc comments for properties wrapped with satisfies', () => {
    const code = `
      type StateAttrMap<State> = { [Key in keyof State]?: string };
      interface MockComponentState {
        active: boolean;
      }

      export const MockComponentDataAttrs = {
        /** Present when the component is active. */
        active: 'data-active',
      } as const satisfies StateAttrMap<MockComponentState>;
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.description).toBe('Present when the component is active.');
  });

  it('returns null when constant not found', () => {
    const code = `
      export const OtherConstant = {
        value: 'data-value',
      };
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).toBeNull();
  });

  it('extracts single-line // comments for properties', () => {
    const code = `
      export const MockComponentDataAttrs = {
        // Present when the component is focused.
        focused: 'data-focused',
      } as const;
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.description).toBe('Present when the component is focused.');
  });

  it('falls back to data-{key} when value is not a string literal', () => {
    const code = `
      const PREFIX = 'data-';
      export const MockComponentDataAttrs = {
        active: PREFIX + 'active',
      };
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.name).toBe('data-active');
  });
});
