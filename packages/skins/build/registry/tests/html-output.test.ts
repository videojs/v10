import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const registryDir = resolve(import.meta.dirname, '../../../dist/registry/source/r/html');

describe('HTML registry output', () => {
  it('marks copied skins so build-time IDs are scoped per player', () => {
    const files = readdirSync(registryDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name === 'skin.html')
      .map((entry) => resolve(entry.parentPath, entry.name));

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      expect(readFileSync(file, 'utf8'), file).toContain('<media-container data-vjs-scope-ids');
      expect(readFileSync(file, 'utf8'), file).toContain('data-vjs-source-id id="vjs-');
    }
  });

  it('does not close HTML void elements', () => {
    const files = readdirSync(registryDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name === 'skin.html')
      .map((entry) => resolve(entry.parentPath, entry.name));

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /<\/(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)>/i
      );
    }
  });
});
