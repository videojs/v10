import type { RolldownOutput } from 'rolldown';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';

import { iconElementPlugin } from '../index';

describe('iconElementPlugin in Vite', () => {
  it('accepts the Rolldown plugin through the Vite plugin API', async () => {
    const output = (await build({
      configFile: false,
      logLevel: 'silent',
      plugins: [iconElementPlugin()],
      build: {
        write: false,
        rolldownOptions: { input: '@videojs/icons/element/minimal' },
      },
    })) as RolldownOutput;
    const chunk = output.output.find((item) => item.type === 'chunk');

    expect(chunk?.code).toContain('customElements.define');
    expect(chunk?.code).toContain('m13.473');
  });
});
