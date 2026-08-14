import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { canonicalRoot, loadSkinCatalog } from '../../catalog/load';
import type { ResolvedSkinCatalog } from '../../catalog/types';
import { generateReactRegistry } from '../source';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('generateReactRegistry', () => {
  it('derives source layouts from Skin item types', async () => {
    const catalog = await loadSkinCatalog();
    const output = await generateReactRegistry(catalog, {
      rootDir: canonicalRoot,
      itemNames: ['default-video', 'play-button'],
    });

    expect(Object.keys(output.items)).toEqual(['default-video', 'play-button']);
    expect(output.items['default-video']?.some((file) => file.path === 'skin.tsx')).toBe(true);
    expect(output.items['default-video']?.find((file) => file.path === 'skin.tsx')?.content).toContain(
      'className={cn("media-skin media-skin-video media-theme-default", className)}'
    );
    expect(output.items['play-button']?.some((file) => file.path === 'components/play-button/play-button.tsx')).toBe(
      true
    );
    expect(output.sharedFiles.map((file) => file.path)).toEqual([
      'styles/tailwind.css',
      'styles/base.css',
      'styles/themes/default.css',
    ]);
    expect(
      Object.values(output.items)
        .flat()
        .every((file) => file.kind === 'source')
    ).toBe(true);
    expect(output.packageDependenciesByItem['play-button']).toEqual(['@videojs/react']);
  });

  it('emits private helper modules without promoting them to catalog items', async () => {
    const root = setup({
      'entry.tsx': `import { helper } from './helpers'; export function Entry(){ return <div>{helper}</div>; }`,
      'helpers/index.ts': `import { createElement } from 'react'; export const helper = createElement;`,
      'styles/tailwind.css': `@import "tailwindcss" theme(inline);\n@theme inline { --color-test: red; }\n@source "../";\n`,
      'styles/base.css': `@layer videojs.base {}`,
      'styles/theme.css': `@layer videojs.theme {}`,
    });
    const catalog: ResolvedSkinCatalog = {
      resources: {
        styles: {
          tailwind: './styles/tailwind.css',
          base: './styles/base.css',
          themes: { default: './styles/theme.css' },
        },
      },
      items: [
        {
          name: 'entry',
          type: 'component',
          source: './entry.tsx',
          title: 'Entry',
          description: 'Entry.',
          dependencies: [],
          sourceFiles: ['./entry.tsx', './helpers/index.ts'],
          styleFiles: [],
          symbols: { components: [], icons: [] },
        },
      ],
    };

    const output = await generateReactRegistry(catalog, { rootDir: root, itemNames: ['entry'] });

    expect(output.items.entry?.map((file) => file.path)).toEqual([
      'components/entry/entry.tsx',
      'components/entry/helpers/index.ts',
    ]);
    expect(output.items.entry?.find((file) => file.path.endsWith('entry.tsx'))?.content).toContain(
      'from "./helpers/index"'
    );
    expect(output.packageDependenciesByItem.entry).toEqual(['react']);
  });
});

function setup(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'videojs-skins-registry-'));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }
  return root;
}
