import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vitest';

import { schemaPlugin } from '../../../rolldown';

describe('schemaPlugin', () => {
  it('creates a schema entry directly from inline bundler configuration', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-schema-plugin-'));
    const sourceDir = join(root, 'play-button');
    const source = join(sourceDir, 'play-button-component.ts');
    mkdirSync(sourceDir);
    writeFileSync(
      source,
      `const defineComponent: any = (value: any) => value; export default defineComponent({ name: 'PlayButton' });`
    );
    const plugin = schemaPlugin({
      cwd: root,
      source: '@fixture/components',
      include: ['./*/*-component.ts'],
    });

    const bundle = await rolldown({ input: plugin.moduleId, plugins: [plugin] });
    const output = await bundle.generate({ format: 'es' });

    expect(output.output[0]?.code).toContain('PlayButton');
    expect(plugin.moduleId).toBe('virtual:vjsc/schema');
  });
});
