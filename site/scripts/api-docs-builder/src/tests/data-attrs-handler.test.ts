import { describe, expect, it } from 'vitest';
import { extractDataAttrs } from '../data-attrs-handler.js';
import { createTestProgram, createTypedTestProgram } from './test-utils.js';

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

  it('extracts @type JSDoc tag as type field', () => {
    const code = `
      export const MockComponentDataAttrs = {
        /**
         * The fill level.
         * @type {'empty' | 'partial' | 'full'}
         */
        fillState: 'data-fill-state',
      } as const;
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.type).toBe("'empty' | 'partial' | 'full'");
  });

  it('separates description from @type line', () => {
    const code = `
      export const MockComponentDataAttrs = {
        /**
         * The fill level.
         * @type {'empty' | 'partial' | 'full'}
         */
        fillState: 'data-fill-state',
      } as const;
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.description).toBe('The fill level.');
    expect(result!.attrs[0]!.description).not.toContain('@type');
  });

  it('omits type when no @type tag present', () => {
    const code = `
      export const MockComponentDataAttrs = {
        /** Present when the component is active. */
        active: 'data-active',
      } as const;
    `;
    const program = createTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.type).toBeUndefined();
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

  it('infers boolean as omitted type', () => {
    const code = `
      type StateAttrMap<State> = { [Key in keyof State]?: string };
      interface MockComponentState {
        active: boolean;
      }

      export const MockComponentDataAttrs = {
        active: 'data-active',
      } as const satisfies StateAttrMap<MockComponentState>;
    `;
    const program = createTypedTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.type).toBeUndefined();
  });

  it('infers string literal union from state type', () => {
    const code = `
      type StateAttrMap<State> = { [Key in keyof State]?: string };
      interface MockComponentState {
        level: 'low' | 'medium' | 'high';
      }

      export const MockComponentDataAttrs = {
        level: 'data-level',
      } as const satisfies StateAttrMap<MockComponentState>;
    `;
    const program = createTypedTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.type).toBe("'low' | 'medium' | 'high'");
  });

  it('infers number type from state', () => {
    const code = `
      type StateAttrMap<State> = { [Key in keyof State]?: string };
      interface MockComponentState {
        count: number;
      }

      export const MockComponentDataAttrs = {
        count: 'data-count',
      } as const satisfies StateAttrMap<MockComponentState>;
    `;
    const program = createTypedTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.type).toBe('number');
  });

  it('infers through type alias to expanded literals', () => {
    const code = `
      type StateAttrMap<State> = { [Key in keyof State]?: string };
      type VolumeLevel = 'off' | 'low';
      interface MockComponentState {
        level: VolumeLevel;
      }

      export const MockComponentDataAttrs = {
        level: 'data-level',
      } as const satisfies StateAttrMap<MockComponentState>;
    `;
    const program = createTypedTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.type).toBe("'off' | 'low'");
  });

  it('JSDoc @type overrides inferred type', () => {
    const code = `
      type StateAttrMap<State> = { [Key in keyof State]?: string };
      interface MockComponentState {
        level: 'low' | 'medium' | 'high';
      }

      export const MockComponentDataAttrs = {
        /**
         * The volume level.
         * @type {'quiet' | 'loud'}
         */
        level: 'data-level',
      } as const satisfies StateAttrMap<MockComponentState>;
    `;
    const program = createTypedTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.type).toBe("'quiet' | 'loud'");
  });

  it('no satisfies expression produces no inferred type', () => {
    const code = `
      export const MockComponentDataAttrs = {
        active: 'data-active',
      } as const;
    `;
    const program = createTypedTestProgram(code);
    const result = extractDataAttrs('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.attrs[0]!.type).toBeUndefined();
  });
});
