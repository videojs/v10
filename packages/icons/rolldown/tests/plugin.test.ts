import { resolve } from 'node:path';

import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vitest';

import { iconElementPlugin } from '../index';

describe('iconElementPlugin', () => {
  it('loads an icon family through the host graph and watches its directory', async () => {
    const bundle = await rolldown({
      input: '@videojs/icons/element/minimal',
      plugins: [iconElementPlugin()],
    });
    const output = await bundle.generate({ format: 'es' });
    const chunk = output.output.find((item) => item.type === 'chunk');

    expect(chunk?.code).toContain('MediaIconElement.register(family, icons)');
    expect(chunk?.code).toContain('"play":');
    await expect(bundle.watchFiles).resolves.toContain(resolve(import.meta.dirname, '../../src/assets/minimal'));
  });

  it('does not resolve invalid family names', async () => {
    const bundle = await rolldown({ input: '@videojs/icons/element/..', plugins: [iconElementPlugin()] });
    await expect(bundle.generate({ format: 'es' })).rejects.toThrow();
  });
});
