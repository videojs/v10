import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { defineConfig, jsx } from '@videojs/compiler';
import { afterEach, describe, expect, it } from 'vitest';
import { emitReactModules } from '../react-modules';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('emitReactModules', () => {
  it('transforms a complete module set and rewrites directory index imports', async () => {
    const root = setup({
      'entry.tsx': `import { helper } from './helpers'; export function Entry(){ return <div>{helper}</div>; }`,
      'helpers/index.ts': `import { createElement } from 'react'; export const helper = createElement;`,
    });

    const output = await emitReactModules({
      rootDir: root,
      layouts: [
        { inputFile: join(root, 'entry.tsx'), outputFile: 'skin.tsx' },
        { inputFile: join(root, 'helpers/index.ts'), outputFile: 'internal/helpers/index.ts' },
      ],
      config: defineConfig({ target: jsx() }),
      description: 'Fixture',
    });

    expect(output.files.map((file) => file.path)).toEqual(['internal/helpers/index.ts', 'skin.tsx']);
    expect(output.files.find((file) => file.path === 'skin.tsx')?.content).toContain('from "./internal/helpers/index"');
    expect(output.dependencies).toEqual(['react']);
  });

  it('reports relative imports that are outside the supplied layout', async () => {
    const root = setup({
      'entry.tsx': `import { helper } from './helper'; export const Entry = helper;`,
      'helper.ts': `export const helper = null;`,
    });

    await expect(
      emitReactModules({
        rootDir: root,
        layouts: [{ inputFile: join(root, 'entry.tsx'), outputFile: 'entry.tsx' }],
        config: defineConfig({ target: jsx() }),
        description: 'Fixture',
      })
    ).rejects.toThrow('Fixture cannot map `./helper`');
  });
});

function setup(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'videojs-skins-react-modules-'));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }
  return root;
}
