import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { defineCatalog } from '../define';
import { loadCatalog, resolveCatalog } from '../resolve';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('defineCatalog', () => {
  it('preserves authored item metadata and literal names', () => {
    const definition = defineCatalog({
      resources: { styles: './styles.css' },
      imports: { '@example/components': 'components' },
      items: [{ name: 'player', source: './player.tsx', type: 'skin', style: { variant: 'default' } }],
    });

    expectTypeOf(definition.items[0]!.name).toEqualTypeOf<'player'>();
    expectTypeOf(definition.items[0]!.style.variant).toEqualTypeOf<'default'>();
  });
});

describe('loadCatalog', () => {
  it('analyzes item dependencies, private source, styles, and configured imports', async () => {
    const root = setup({
      'entry.tsx': `import { Helper } from './private/helper'; import './entry.styles'; export const Entry = Helper;`,
      'entry.styles.ts': `export default {};`,
      'private/helper.tsx': `import { Dependency } from '../dependency'; import { Controls } from '@example/components'; export const Helper = Dependency ?? Controls;`,
      'dependency.tsx': `export const Dependency = null;`,
    });
    const definition = defineCatalog({
      resources: { styles: './styles.css' },
      imports: { '@example/components': 'components' },
      items: [
        { name: 'entry', source: './entry.tsx', type: 'component' },
        { name: 'dependency', source: './dependency.tsx', type: 'component' },
      ],
    });

    const loaded = await loadCatalog(definition, { rootDir: root });

    expect(loaded.items.find((item) => item.name === 'entry')).toEqual({
      name: 'entry',
      source: './entry.tsx',
      type: 'component',
      dependencies: ['dependency'],
      files: {
        source: ['./entry.tsx', './private/helper.tsx'],
        style: ['./entry.styles.ts'],
      },
      references: { components: ['Controls'] },
    });
    expectTypeOf(loaded.resources).toEqualTypeOf<{ readonly styles: './styles.css' }>();
  });

  it('rejects missing imports and dependency cycles', async () => {
    const missingRoot = setup({ 'entry.tsx': `import './missing'; export const Entry = null;` });
    await expect(
      loadCatalog(defineCatalog({ items: [{ name: 'entry', source: './entry.tsx' }] }), { rootDir: missingRoot })
    ).rejects.toThrow('cannot resolve `./missing`');

    const cycleRoot = setup({
      'a.tsx': `import { B } from './b'; export const A = B;`,
      'b.tsx': `import { A } from './a'; export const B = A;`,
    });
    await expect(
      loadCatalog(
        defineCatalog({
          items: [
            { name: 'a', source: './a.tsx' },
            { name: 'b', source: './b.tsx' },
          ],
        }),
        { rootDir: cycleRoot }
      )
    ).rejects.toThrow('Catalog dependency cycle: a -> b -> a.');
  });

  it('enforces allowed package imports across source and style modules', async () => {
    const root = setup({
      'entry.tsx': `import { allowed } from '@example/allowed'; import styles from './entry.styles'; export const Entry = allowed ?? styles;`,
      'entry.styles.ts': `import { styles } from '@example/styles'; export default styles;`,
    });
    const definition = defineCatalog({
      allowedImports: ['@example/allowed', /^@example\/styles$/],
      items: [{ name: 'entry', source: './entry.tsx' }],
    });

    await expect(loadCatalog(definition, { rootDir: root })).resolves.toBeDefined();

    writeFileSync(join(root, 'entry.styles.ts'), `import '@example/not-allowed'; export default {};`);

    await expect(loadCatalog(definition, { rootDir: root })).rejects.toThrow(
      'imports package `@example/not-allowed`, which is not allowed'
    );
  });
});

describe('resolveCatalog', () => {
  it('resolves requested items with their transitive requirements', async () => {
    const root = setup({
      'a.ts': `import { B } from './b'; export const A = B;`,
      'b.ts': `import { C } from './c'; export const B = C;`,
      'c.ts': `export const C = null;`,
      'unused.ts': `export const Unused = null;`,
    });
    const definition = defineCatalog({
      items: [
        { name: 'a', source: './a.ts' },
        { name: 'b', source: './b.ts' },
        { name: 'c', source: './c.ts' },
        { name: 'unused', source: './unused.ts' },
      ],
    });
    const loaded = await loadCatalog(definition, { rootDir: root });

    const resolved = resolveCatalog(loaded, ['a']);

    expect(resolved.items.map((item) => item.name)).toEqual(['c', 'b', 'a']);
    expect(resolved.files).toEqual({ source: ['./a.ts', './b.ts', './c.ts'], style: [] });
  });
});

function setup(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'videojs-compiler-catalog-'));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }
  return root;
}
