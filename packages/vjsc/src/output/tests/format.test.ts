import { describe, expect, it } from 'vite-plus/test';

import { createOxfmtSourceFormatter } from '../format';

describe('createOxfmtSourceFormatter', () => {
  it('formats one editable source with path-specific options', async () => {
    const format = createOxfmtSourceFormatter((path) => ({
      semi: true,
      singleQuote: path.endsWith('.ts'),
    }));

    await expect(format({ path: 'component.ts', content: 'export const value="test"' })).resolves.toBe(
      "export const value = 'test';\n"
    );
  });

  it('reports the source path when formatting fails', async () => {
    const format = createOxfmtSourceFormatter();

    await expect(format({ path: 'component.ts', content: 'export const =' })).rejects.toThrow(
      /generated source `component\.ts`/
    );
  });
});
