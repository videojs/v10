import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { rolldown } from 'rolldown';
import { describe, expect, it, vi } from 'vitest';

import { vjsCompiler } from '../rolldown';

describe('vjsCompiler', () => {
  it('bundles a generated entry and its relative source imports', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-rolldown-'));
    const source = join(root, 'value.ts');
    const virtualFile = join(root, '.vjsc/entry.ts');
    writeFileSync(source, 'export const value = 42;');
    const load = vi.fn(() => ({
      code: `export { value } from '../value.ts';`,
      watchFiles: [source],
    }));

    const bundle = await rolldown({
      input: 'virtual:vjsc/entry.ts',
      plugins: [
        vjsCompiler({
          modules: [{ id: 'virtual:vjsc/entry.ts', load }],
          resolveId: () => virtualFile,
        }),
      ],
    });
    const output = await bundle.generate({ format: 'es' });

    expect(output.output[0]?.code).toContain('const value = 42');
    expect(load).toHaveBeenCalledOnce();
  });
});
