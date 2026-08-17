import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { defineConfig, jsx } from '../../config';
import { catalog } from '../define';
import { emitCatalog } from '../emit';
import { loadCatalog } from '../resolve';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('emitCatalog', () => {
  it('transforms, relinks, and collects dependencies for selected catalog items', async () => {
    const root = setup({
      'entry.tsx': `import { dependency } from './dependency'; import { helper } from './private/helper'; import React from 'react'; export const entry = [dependency, helper, React];`,
      'private/helper.ts': `export const helper: number = 1;`,
      'dependency.ts': `export const dependency: number = 2;`,
      'unused.ts': `export const unused = true;`,
    });
    const definition = catalog({
      items: [
        { name: 'entry', source: './entry.tsx' },
        { name: 'dependency', source: './dependency.ts' },
        { name: 'unused', source: './unused.ts' },
      ],
    });
    const loaded = await loadCatalog(definition, { rootDir: root });

    const output = await emitCatalog(loaded, {
      items: ['entry', 'dependency'],
      compiler: {
        config: () => defineConfig({ target: jsx() }),
      },
      resolve: {
        file({ item, sourceFile }) {
          return sourceFile === item.source ? `${item.name}/index.ts` : `${item.name}/${sourceFile.slice(2)}`;
        },
        imports: {
          dependency: ({ dependency }) => `@/components/${dependency.name}`,
        },
      },
    });

    expect(Object.keys(output.items)).toEqual(['dependency', 'entry']);
    expect(output.items.entry?.files.map((file) => file.path)).toEqual(['entry/index.ts', 'entry/private/helper.ts']);
    expect(output.items.entry?.files.find((file) => file.path === 'entry/index.ts')?.content).toContain(
      'from "@/components/dependency"'
    );
    expect(output.items.entry?.files.find((file) => file.path === 'entry/index.ts')?.content).toMatch(
      /from ["']\.\/private\/helper["']/
    );
    expect(output.items.entry?.dependencies).toEqual(['react']);
    expect(output.items.unused).toBeUndefined();
  });
});

function setup(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'videojs-compiler-catalog-output-'));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }
  return root;
}
