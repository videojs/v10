import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const registryDir = resolve(import.meta.dirname, '../../../dist/registry/source/r/html');

describe('HTML registry output', () => {
  it('sizes video skins on their container instead of their player', () => {
    const files = readdirSync(registryDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name === 'skin.html')
      .map((entry) => resolve(entry.parentPath, entry.name));

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = readFileSync(file, 'utf8');

      if (/\/files\/(?:live-)?audio\/skin\.html$/u.test(file)) {
        expect(source, file).not.toContain('aspect-ratio: 16 / 9');
      } else {
        expect(source, file).toContain('<media-container style="display: block; width: 100%; aspect-ratio: 16 / 9;"');
      }
    }
  });
});
