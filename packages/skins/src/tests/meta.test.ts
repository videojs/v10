import { readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { skinStyles } from '../meta';

const skinsDir = resolve(import.meta.dirname, '../skins');
const skinDirectories = readdirSync(skinsDir, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name === 'skin.tsx')
  .map((entry) => relative(skinsDir, entry.parentPath).split(sep).join('-'))
  .sort();

describe('skinStyles', () => {
  it('describes exactly the published skin directories', () => {
    expect(Object.keys(skinStyles).sort()).toEqual(skinDirectories);
  });

  it('derives each scope from its theme and preset', () => {
    for (const [name, style] of Object.entries(skinStyles)) {
      expect(name).toBe(`${style.theme}-${style.preset}`);
      expect(style.scope).toBe(`.media-skin[data-theme="${style.theme}"][data-preset="${style.preset}"]`);
    }
  });
});
