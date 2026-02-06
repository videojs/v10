import { describe, expect, it } from 'vitest';
import { extractHtml } from '../html-handler.js';
import { createTestProgram } from './test-utils.js';

describe('extractHtml', () => {
  it('extracts tagName from {Name}Element class', () => {
    const code = `
      export class MockComponentElement {
        static readonly tagName = 'media-mock-component';
      }
    `;
    const program = createTestProgram(code);
    const result = extractHtml('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.tagName).toBe('media-mock-component');
  });

  it('extracts tagName without readonly modifier', () => {
    const code = `
      export class MockComponentElement {
        static tagName = 'media-mock-component';
      }
    `;
    const program = createTestProgram(code);
    const result = extractHtml('test.ts', program, 'MockComponent');

    expect(result).not.toBeNull();
    expect(result!.tagName).toBe('media-mock-component');
  });

  it('returns null when Element class not found', () => {
    const code = `
      export class OtherClass {
        static readonly tagName = 'media-other';
      }
    `;
    const program = createTestProgram(code);
    const result = extractHtml('test.ts', program, 'MockComponent');

    expect(result).toBeNull();
  });

  it('returns null when tagName not static', () => {
    const code = `
      export class MockComponentElement {
        readonly tagName = 'media-mock-component';
      }
    `;
    const program = createTestProgram(code);
    const result = extractHtml('test.ts', program, 'MockComponent');

    expect(result).toBeNull();
  });

  it('returns null when tagName is not a string literal', () => {
    const code = `
      const TAG = 'media-mock-component';
      export class MockComponentElement {
        static readonly tagName = TAG;
      }
    `;
    const program = createTestProgram(code);
    const result = extractHtml('test.ts', program, 'MockComponent');

    expect(result).toBeNull();
  });

  it('returns null when no tagName property exists', () => {
    const code = `
      export class MockComponentElement {
        static readonly otherProperty = 'value';
      }
    `;
    const program = createTestProgram(code);
    const result = extractHtml('test.ts', program, 'MockComponent');

    expect(result).toBeNull();
  });
});
