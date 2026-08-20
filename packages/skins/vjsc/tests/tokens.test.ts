import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import { tokens } from '../styles/tokens';

describe('tokens', () => {
  test('classifies every VJSC --media-* custom property', async () => {
    const root = resolve(import.meta.dirname, '..');
    const entries = await readdir(root, { recursive: true, withFileTypes: true });
    const files = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          /\.(?:css|ts|tsx)$/.test(entry.name) &&
          entry.name !== 'tokens.ts' &&
          !entry.parentPath.includes('/vjsc/registry') &&
          !entry.parentPath.includes('/vjsc/tests')
      )
      .map((entry) => resolve(entry.parentPath, entry.name));
    const referenced = new Set<string>();

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      for (const match of source.matchAll(/--media-[a-zA-Z0-9_-]+/g)) referenced.add(match[0]);
    }

    expect([...referenced].sort()).toEqual(Object.keys(tokens).sort());
  });

  test('prefixes skin-local custom properties', async () => {
    const stylesRoot = resolve(import.meta.dirname, '../styles');
    const entries = await readdir(stylesRoot, { recursive: true, withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && /\.(?:css|ts)$/.test(entry.name) && entry.name !== 'tokens.ts')
      .map((entry) => resolve(entry.parentPath, entry.name));
    const customProperties = new Set<string>();

    for (const file of files) {
      const source = await readFile(file, 'utf8');

      for (const match of source.matchAll(/--[a-zA-Z0-9_-]+/g)) customProperties.add(match[0]);
    }

    const unprefixed = [...customProperties].filter(
      (property) =>
        !property.startsWith('--media-') &&
        property !== '--spacing' &&
        !/^--(?:color|drop-shadow|ease|font|radius|shadow|spacing|text)-media(?:-|$)/.test(property)
    );

    expect(unprefixed).toEqual([]);
    expect([...customProperties].filter((property) => property.startsWith('--media-resolved-'))).toEqual([]);
    expect(Object.values(tokens).some((token) => token.kind === 'internal')).toBe(true);
    expect(tokens['--media-video-border-radius'].kind).toBe('bridge');
  });
});
