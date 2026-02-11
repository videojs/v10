import * as tae from 'typescript-api-extractor';
import { describe, expect, it, type MockInstance, vi } from 'vitest';
import { extractPartDescription, extractParts } from '../parts-handler.js';
import { createTestProgram } from './test-utils.js';

vi.mock('typescript-api-extractor', async () => {
  const actual = await vi.importActual<typeof tae>('typescript-api-extractor');
  return {
    ...actual,
    parseFromProgram: vi.fn(),
  };
});

const mockParseFromProgram = tae.parseFromProgram as unknown as MockInstance;

describe('extractParts', () => {
  it('extracts value exports from index.parts.ts', () => {
    const code = `
      export { Group, type GroupProps } from './time-group';
      export { Separator, type SeparatorProps } from './time-separator';
      export { Value, type ValueProps } from './time-value';
    `;
    const program = createTestProgram(code);
    const result = extractParts('test.ts', program);

    expect(result).toEqual([
      { name: 'Group', source: './time-group' },
      { name: 'Separator', source: './time-separator' },
      { name: 'Value', source: './time-value' },
    ]);
  });

  it('filters out type-only exports', () => {
    const code = `
      export { Group, type GroupProps } from './time-group';
      export type { SomeType } from './types';
    `;
    const program = createTestProgram(code);
    const result = extractParts('test.ts', program);

    expect(result).toEqual([{ name: 'Group', source: './time-group' }]);
  });

  it('returns empty array for file with no exports', () => {
    const code = `const x = 1;`;
    const program = createTestProgram(code);
    const result = extractParts('test.ts', program);

    expect(result).toEqual([]);
  });

  it('handles multiple value exports from same source', () => {
    const code = `
      export { Foo, Bar } from './source';
    `;
    const program = createTestProgram(code);
    const result = extractParts('test.ts', program);

    expect(result).toEqual([
      { name: 'Foo', source: './source' },
      { name: 'Bar', source: './source' },
    ]);
  });

  it('skips type-only specifiers within a value export declaration', () => {
    const code = `
      export { Value, type ValueProps, type ValueState } from './time-value';
    `;
    const program = createTestProgram(code);
    const result = extractParts('test.ts', program);

    expect(result).toEqual([{ name: 'Value', source: './time-value' }]);
  });
});

describe('extractPartDescription', () => {
  it('extracts JSDoc description from a named export', () => {
    const program = createTestProgram('');
    mockParseFromProgram.mockReturnValue({
      exports: [
        {
          name: 'Value',
          documentation: {
            description: 'Displays a formatted time value (current, duration, or remaining).',
          },
        },
      ],
    });

    const result = extractPartDescription('test.tsx', program, 'Value');

    expect(result).toBe('Displays a formatted time value (current, duration, or remaining).');
  });

  it('strips @example blocks from description', () => {
    const program = createTestProgram('');
    mockParseFromProgram.mockReturnValue({
      exports: [
        {
          name: 'Group',
          documentation: {
            description: 'Container for composed time displays.\n\n@example\n```tsx\n<Time.Group />\n```',
          },
        },
      ],
    });

    const result = extractPartDescription('test.tsx', program, 'Group');

    expect(result).toBe('Container for composed time displays.');
  });

  it('returns undefined when export is not found', () => {
    const program = createTestProgram('');
    mockParseFromProgram.mockReturnValue({
      exports: [{ name: 'OtherComponent', documentation: { description: 'Some desc.' } }],
    });

    const result = extractPartDescription('test.tsx', program, 'Value');

    expect(result).toBeUndefined();
  });

  it('returns undefined when export has no documentation', () => {
    const program = createTestProgram('');
    mockParseFromProgram.mockReturnValue({
      exports: [{ name: 'Value' }],
    });

    const result = extractPartDescription('test.tsx', program, 'Value');

    expect(result).toBeUndefined();
  });

  it('returns undefined for empty description', () => {
    const program = createTestProgram('');
    mockParseFromProgram.mockReturnValue({
      exports: [{ name: 'Value', documentation: { description: '' } }],
    });

    const result = extractPartDescription('test.tsx', program, 'Value');

    expect(result).toBeUndefined();
  });
});
