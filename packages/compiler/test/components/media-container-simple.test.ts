/**
 * Tests for: media-container-simple.tsx
 * Tests {children} → slot transformation
 */

import type { CompileResult } from '../../src';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';
import { getClasses, parseElement, querySelector } from '../helpers/dom';

describe('fixture: MediaContainer - Simple', () => {
  let result: CompileResult;
  let root: Element;

  beforeAll(() => {
    const source = readFileSync(
      join(__dirname, '../fixtures/components/containers/media-container-simple.tsx'),
      'utf-8',
    );
    result = compile(source);
    root = parseElement(result.html);
  });

  it('transforms to media-container element', () => {
    expect(root.tagName.toLowerCase()).toBe('media-container');
  });

  it('preserves className', () => {
    expect(getClasses(root)).toContain('container');
  });

  it('has exactly 1 child (slot)', () => {
    expect(root.children.length).toBe(1);
  });

  it('contains slot element', () => {
    const slot = querySelector(root, 'slot');
    expect(slot.tagName.toLowerCase()).toBe('slot');
  });

  it('slot has name="media" attribute', () => {
    const slot = querySelector(root, 'slot');
    expect(slot.getAttribute('name')).toBe('media');
  });

  it('slot has slot="media" attribute', () => {
    const slot = querySelector(root, 'slot');
    expect(slot.getAttribute('slot')).toBe('media');
  });

  it('{children} transforms to slot element', () => {
    // Verify the specific slot pattern for children
    const slot = root.querySelector('slot[name="media"][slot="media"]');
    expect(slot).not.toBeNull();
  });
});
