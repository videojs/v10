import { describe, expect, it } from 'vitest';
import { transform } from 'vjsc';
import { defineComponent, defineSchema } from 'vjsc/components';
import { registryPlugin } from 'vjsc/registry';
import { createHtmlRegistry, createReactRegistry } from '../registry';

const schema = defineSchema('@videojs/icons/vjsc', {
  PlayIcon: defineComponent({ name: 'PlayIcon' }),
});

const source = `
  import { PlayIcon } from '@videojs/icons/vjsc';

  export const icon = <PlayIcon className="icon" />;
`;

describe('icon registries', () => {
  it('maps canonical icons to the selected React family', async () => {
    const result = await transform(source, {
      plugins: [registryPlugin(createReactRegistry(schema, { family: 'minimal' }))],
    });

    expect(result.code).toMatch(/^\/\*\* @jsxImportSource react \*\//);
    expect(result.code).toContain('import { PlayIcon } from "@videojs/react/icons/minimal";');
    expect(result.code).toContain('<PlayIcon className="icon"/>');
  });

  it('maps canonical icons to the lazy HTML icon element', async () => {
    const result = await transform(source, {
      plugins: [registryPlugin(createHtmlRegistry(schema, { family: 'minimal' }))],
    });

    expect(result.code).toMatch(/^\/\*\* @jsxImportSource vjsc\/html-runtime \*\//);
    expect(result.code).toContain('import "@videojs/html/icons/element/minimal";');
    expect(result.code).toContain('<media-icon class="icon" family="minimal" name="play"/>');
  });
});
