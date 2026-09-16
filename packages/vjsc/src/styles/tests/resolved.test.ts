import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { createResolvedStyles, loadStyleModule } from '../resolved';

async function writeStyleModule(directory: string, name: string, className: string, utilities: string) {
  const file = join(directory, `${name}.styles.ts`);

  await writeFile(
    file,
    `import { styles } from 'vjsc/styles';\n\nexport default styles({ file: 'buttons.css', rules: { root: { className: '${className}', utilities: '${utilities}' } } });\n`
  );

  return file;
}

describe('loadStyleModule', () => {
  it('normalizes one module independently of the set that imports it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vjsc-resolved-'));
    const button = await loadStyleModule(await writeStyleModule(directory, 'button', 'media-button', 'grid p-0'));

    expect([...button.rules.keys()]).toEqual(['root']);
    expect(button.rules.get('root')).toMatchObject({
      className: 'media-button',
      file: 'buttons.css',
      layer: 'components',
      modulePath: button.modulePath,
      utilities: ['grid', 'p-0'],
    });
    expect(button.watchFiles).toContain(button.modulePath);
  });
});

describe('createResolvedStyles', () => {
  it('merges loaded modules and reuses their rule maps', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vjsc-resolved-'));
    const button = await loadStyleModule(await writeStyleModule(directory, 'button', 'media-button', 'grid'));
    const icon = await loadStyleModule(await writeStyleModule(directory, 'icon', 'media-icon', 'size-4'));
    const merged = createResolvedStyles([button, icon]);

    expect(merged.modules.get(button.modulePath)).toBe(button.rules);
    expect(merged.modules.get(icon.modulePath)).toBe(icon.rules);
    expect(merged.rules.map((rule) => rule.className)).toEqual(['media-button', 'media-icon']);
    expect(merged.watchFiles).toEqual(expect.arrayContaining([button.modulePath, icon.modulePath]));
  });

  it('rejects one class defined by two modules in the same set', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vjsc-resolved-'));
    const button = await loadStyleModule(await writeStyleModule(directory, 'button', 'media-button', 'grid'));
    const copy = await loadStyleModule(await writeStyleModule(directory, 'copy', 'media-button', 'flex'));

    expect(() => createResolvedStyles([button, copy])).toThrow(/is defined by both/);
  });
});
