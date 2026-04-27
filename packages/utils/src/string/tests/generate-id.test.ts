import { describe, expect, it } from 'vitest';
import { generateId } from '../generate-id';

describe('generateId', () => {
  it('generates a string ID', () => {
    const id = generateId();

    expect(typeof id).toBe('string');
  });

  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    const id3 = generateId();

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it('generates IDs without decimals', () => {
    const id = generateId();

    expect(id).not.toMatch(/\./);
  });

  it('generates IDs in consistent format', () => {
    const id = generateId();

    // Should be timestamp-random format
    expect(id).toMatch(/^\d+-\d+$/);
  });

  it('generates different IDs in rapid succession', () => {
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }

    // All should be unique
    expect(ids.size).toBe(100);
  });
});
