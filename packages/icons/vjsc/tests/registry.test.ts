import { describe, expect, it } from 'vitest';
import { html, jsx, transform } from 'vjsc';
import { plugin } from 'vjsc/registry';
import { registry as htmlRegistry } from '../html';
import { registry as reactRegistry } from '../react';

const source = `
  import { PlayIcon } from '@videojs/icons/vjsc';

  export const icon = <PlayIcon className="icon" />;
`;

describe('icon registries', () => {
  it('maps canonical icons to the selected React family', async () => {
    const result = await transform(source, {
      config: {
        target: jsx(),
        plugins: [plugin(reactRegistry({ family: 'minimal' }))],
      },
    });

    expect(result.code).toContain('import { PlayIcon } from "@videojs/react/icons/minimal";');
    expect(result.code).toContain('<PlayIcon className="icon"/>');
  });

  it('maps canonical icons to the lazy HTML icon element', async () => {
    const result = await transform(source, {
      config: {
        target: html(),
        plugins: [plugin(htmlRegistry({ family: 'minimal' }))],
      },
    });

    expect(result.code).toContain('import "@videojs/html/icons/element/minimal";');
    expect(result.code).toContain('<media-icon class="icon" family="minimal" name="play"/>');
  });
});
