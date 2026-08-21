import { describe, expect, it } from 'vitest';
import { transform } from '../../ts/transform';
import { componentMetaPlugin } from '../meta';

describe('component metadata', () => {
  it('captures metadata and removes it from projected modules', async () => {
    const result = await transform(
      `import type { ComponentMeta } from 'vjsc/components';\nexport const meta = { name: 'play', type: 'component' } as const satisfies ComponentMeta;\nexport function Play() { return <button />; }`,
      { plugins: [componentMetaPlugin()] }
    );

    expect(result.code).not.toContain('ComponentMeta');
    expect(result.code).not.toContain('const meta');
    expect(result.code).toContain('function Play');
    expect(result.meta.component).toEqual({ name: 'play', type: 'component' });
  });

  it('preserves declarations exported beside metadata', async () => {
    const result = await transform(`export const meta = { name: 'play' }, retained = 42;`, {
      plugins: [componentMetaPlugin()],
    });

    expect(result.code).not.toContain('meta =');
    expect(result.code).toContain('export const retained = 42;');
  });
});
