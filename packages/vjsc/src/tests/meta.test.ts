import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { discoverVjscModules, extractVjscModuleMeta, moduleMetaPlugin } from '../meta';
import { transform } from '../transform';

describe('VJSC module metadata', () => {
  it('extracts static metadata through satisfies expressions', () => {
    expect(
      extractVjscModuleMeta(
        `export const meta = { name: 'default-video', type: 'skin', style: { theme: 'default' } } as const satisfies Meta;`,
        '/vjsc/skin.tsx'
      )
    ).toEqual({ name: 'default-video', type: 'skin', style: { theme: 'default' } });
  });

  it('discovers metadata and infers source paths', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'vjsc-meta-'));
    mkdirSync(join(rootDir, 'components'));
    writeFileSync(join(rootDir, 'components/play.tsx'), `export const meta = { name: 'play', type: 'component' };`);
    writeFileSync(join(rootDir, 'components/helper.tsx'), `export function Helper() { return null; }`);

    expect(discoverVjscModules({ rootDir, include: 'components/*.tsx' })).toEqual([
      { name: 'play', type: 'component', source: './components/play.tsx' },
    ]);
  });

  it('excludes matching VJSC modules', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'vjsc-meta-'));
    writeFileSync(join(rootDir, 'included.tsx'), `export const meta = { name: 'included' };`);
    writeFileSync(join(rootDir, 'excluded.tsx'), `export const meta = { name: 'excluded' };`);

    expect(
      discoverVjscModules({ rootDir, include: '*.tsx', exclude: ['excluded.tsx'] }).map((item) => item.name)
    ).toEqual(['included']);
  });

  it('removes metadata exports from projected modules', async () => {
    const result = await transform(
      `import type { VjscModuleMeta } from 'vjsc';\nexport const meta = { name: 'play' } satisfies VjscModuleMeta;\nexport function Play() { return <button />; }`,
      { config: { plugins: [moduleMetaPlugin()] } }
    );

    expect(result.code).not.toContain('VjscModuleMeta');
    expect(result.code).not.toContain('const meta');
    expect(result.code).toContain('function Play');
  });
});
