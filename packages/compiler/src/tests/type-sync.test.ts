import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { syncGeneratedModuleTypes } from '../type-sync';

describe('syncGeneratedModuleTypes', () => {
  it('emits declarations into a mirrored hidden type tree', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'vjsc-types-'));
    const fileName = join(rootDir, 'src/schema.generated.ts');
    await mkdir(join(rootDir, 'src'));
    await writeFile(join(rootDir, 'src/value.ts'), 'export default 1;\n');

    await syncGeneratedModuleTypes({
      rootDir,
      modules: [
        {
          fileName,
          module: {
            code: `import value from './value';\nexport const schema = { value } as const;\n`,
            watchFiles: [],
          },
        },
      ],
    });

    await expect(readFile(join(rootDir, '.vjsc/types/src/schema.generated.d.ts'), 'utf8')).resolves.toBe(
      `export declare const schema: {\n    readonly value: 1;\n};\n`
    );
  });

  it('rejects generated module locations outside the synchronized root', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'vjsc-types-'));

    await expect(
      syncGeneratedModuleTypes({
        rootDir,
        modules: [{ fileName: join(rootDir, '../outside.ts'), module: { code: '', watchFiles: [] } }],
      })
    ).rejects.toThrow('must stay inside its root');
  });
});
