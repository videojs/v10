/**
 * Tests for: current-time-display-simple.tsx
 */

import type { CompileResult } from '../../src';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';
import { getClasses, parseElement } from '../helpers/dom';

describe('fixture: CurrentTimeDisplay - Simple', () => {
  let result: CompileResult;
  let root: Element;

  beforeAll(() => {
    const source = readFileSync(
      join(__dirname, '../fixtures/components/displays/current-time-display-simple.tsx'),
      'utf-8',
    );
    result = compile(source);
    root = parseElement(result.html);
  });

  it('transforms to media-current-time-display element', () => {
    expect(root.tagName.toLowerCase()).toBe('media-current-time-display');
  });

  it('preserves className', () => {
    expect(getClasses(root)).toContain('time');
  });

  it('has no child elements', () => {
    expect(root.children.length).toBe(0);
  });

  it('extracts className', () => {
    expect(result.classNames).toContain('time');
  });
});
