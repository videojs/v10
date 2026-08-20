import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { transform } from '../../transform';
import { catalogMetaPlugin, createCatalogItemsModule, discoverCatalogItems, extractCatalogItemMeta } from '../meta';

describe('catalog metadata', () => {
  it('extracts static metadata through satisfies expressions', () => {
    expect(
      extractCatalogItemMeta(
        `export const meta = { name: 'default-video', type: 'skin', style: { theme: 'default' } } as const satisfies Meta;`,
        '/catalog/skin.tsx'
      )
    ).toEqual({ name: 'default-video', type: 'skin', style: { theme: 'default' } });
  });

  it('discovers metadata and infers source paths', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'vjsc-catalog-'));
    mkdirSync(join(rootDir, 'components'));
    writeFileSync(join(rootDir, 'components/play.tsx'), `export const meta = { name: 'play', type: 'component' };`);
    writeFileSync(join(rootDir, 'components/helper.tsx'), `export function Helper() { return null; }`);

    expect(discoverCatalogItems({ rootDir, files: 'components/*.tsx' })).toEqual([
      { name: 'play', type: 'component', source: './components/play.tsx' },
    ]);
  });

  it('generates a typed catalog inventory module without evaluating entries', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'vjsc-catalog-'));
    mkdirSync(join(rootDir, 'components'));
    const source = join(rootDir, 'components/play.tsx');
    writeFileSync(
      source,
      `throw new Error('must not execute');\nexport const meta = { name: 'play', type: 'component' };`
    );

    const module = createCatalogItemsModule({ rootDir, files: 'components/*.tsx' });

    expect(module.items).toEqual([{ name: 'play', type: 'component', source: './components/play.tsx' }]);
    expect(module.code).toContain('export const items = [');
    expect(module.code).toContain('as const');
    expect(module.watchFiles).toEqual([source]);
  });

  it('removes metadata exports from projected modules', async () => {
    const result = await transform(
      `import type { CatalogItemMeta } from 'vjsc/catalog';\nexport const meta = { name: 'play' } satisfies CatalogItemMeta;\nexport function Play() { return <button />; }`,
      { config: { plugins: [catalogMetaPlugin()] } }
    );

    expect(result.code).not.toContain('CatalogItemMeta');
    expect(result.code).not.toContain('const meta');
    expect(result.code).toContain('function Play');
  });
});
