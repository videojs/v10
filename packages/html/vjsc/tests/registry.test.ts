import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { createSchemaModule, html, transform } from 'vjsc';
import { registryPlugin } from 'vjsc/registry';
import createRegistry from '../registry';

const packageDir = resolve(import.meta.dirname, '../..');
const coreDir = resolve(packageDir, '../core');
const schema = createSchemaModule({
  cwd: coreDir,
  source: '@videojs/core/vjsc',
  include: ['./src/core/ui/*/*-component.ts'],
  output: './.vjsc/virtual/core-schema.ts',
});
const registry = createRegistry(schema.schema as Parameters<typeof createRegistry>[0]);

function compile(source: string, filename = '/project/src/view.tsx') {
  return transform(source, {
    id: filename,
    cwd: '/project',
    plugins: [registryPlugin(registry), html()],
  });
}

describe('registry', () => {
  it('emits root menu trigger and content relationships', async () => {
    const result = await compile(`
      import * as $ from '@videojs/core/vjsc';

      export const view = (
        <$.Menu.Root side="top">
          <$.Menu.Trigger>Settings</$.Menu.Trigger>
          <$.Menu.Content>Content</$.Menu.Content>
        </$.Menu.Root>
      );
    `);
    const contentId = result.code.match(/<media-menu[^>]*id="([^"]+)"/)?.[1];

    expect(contentId).toBeDefined();
    expect(result.code).toContain(`<button commandfor="${contentId}">Settings</button>`);
    expect(result.code).toContain(`<media-menu id="${contentId}" side="top">Content</media-menu>`);
  });

  it('emits submenu trigger and content relationships', async () => {
    const result = await compile(`
      import * as $ from '@videojs/core/vjsc';

      export const view = (
        <$.Menu.Root>
          <$.Menu.SubmenuTrigger>Quality</$.Menu.SubmenuTrigger>
          <$.Menu.Content>Options</$.Menu.Content>
        </$.Menu.Root>
      );
    `);
    const contentId = result.code.match(/<media-menu[^>]*id="([^"]+)"/)?.[1];

    expect(contentId).toBeDefined();
    expect(result.code).toContain(
      `<media-menu-item commandfor="${contentId}" data-has-submenu="">Quality</media-menu-item>`
    );
    expect(result.code).toContain(`<media-menu id="${contentId}">Options</media-menu>`);
  });

  it('merges menu and tooltip relationships onto one concrete trigger', async () => {
    const result = await compile(`
      import * as $ from '@videojs/core/vjsc';

      export const view = (
        <$.Menu.Root>
          <$.Tooltip.Root>
            <$.Tooltip.Trigger>
              <$.Menu.Trigger>Settings</$.Menu.Trigger>
            </$.Tooltip.Trigger>
            <$.Tooltip.Popup>Settings tooltip</$.Tooltip.Popup>
          </$.Tooltip.Root>
          <$.Menu.Content>Content</$.Menu.Content>
        </$.Menu.Root>
      );
    `);
    const menuId = result.code.match(/<media-menu[^>]*id="([^"]+)"/)?.[1];
    const triggerId = result.code.match(/<button[^>]*id="([^"]+)"/)?.[1];

    expect(menuId).toBeDefined();
    expect(triggerId).toBeDefined();
    expect(result.code).toContain(`<button commandfor="${menuId}" id="${triggerId}">Settings</button>`);
    expect(result.code).toContain(`<media-tooltip trigger="${triggerId}">Settings tooltip</media-tooltip>`);
  });
});
