/**
 * Tests for: mute-button-simple.tsx
 */

import type { CompileResult } from '../../src';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';
import { getClasses, parseElement } from '../helpers/dom';

describe('fixture: MuteButton - Simple', () => {
  let result: CompileResult;
  let root: Element;

  beforeAll(() => {
    const source = readFileSync(
      join(__dirname, '../fixtures/components/buttons/mute-button-simple.tsx'),
      'utf-8',
    );
    result = compile(source);
    root = parseElement(result.html);
  });

  it('transforms to media-mute-button element', () => {
    expect(root.tagName.toLowerCase()).toBe('media-mute-button');
  });

  it('preserves className', () => {
    expect(getClasses(root)).toContain('mute-btn');
  });

  it('has no child elements', () => {
    expect(root.children.length).toBe(0);
  });

  it('extracts className', () => {
    expect(result.classNames).toContain('mute-btn');
  });
});
