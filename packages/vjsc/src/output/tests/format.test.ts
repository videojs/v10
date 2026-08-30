import { describe, expect, it } from 'vite-plus/test';

import { createOxfmtSourceFormatter } from '../format';

describe('createOxfmtSourceFormatter', () => {
  it('formats one editable source with path-specific options', async () => {
    const format = createOxfmtSourceFormatter({
      configure: (path) => ({
        semi: true,
        singleQuote: path.endsWith('.ts'),
      }),
    });

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

  it('preserves sources excluded by path', async () => {
    const format = createOxfmtSourceFormatter({ configure: () => null });

    await expect(format({ path: 'template.html', content: '<img></img>' })).resolves.toBe('<img></img>');
  });
});
