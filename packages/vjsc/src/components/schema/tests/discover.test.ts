import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { discoverSchema } from '../discover';

describe('discoverSchema', () => {
  it('discovers manifest definitions and named source files', () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-schema-discovery-'));
    const componentsDir = join(root, 'components');
    const iconsDir = join(root, 'icons');

    mkdirSync(componentsDir);
    mkdirSync(iconsDir);
    const component = join(componentsDir, 'play-button.ts');
    const icon = join(iconsDir, 'play.svg');

    writeFileSync(
      component,
      `const defineComponent: any = (value: any) => value;
       export default defineComponent({
         name: 'PlayButton',
         root: 'Root',
         parts: { Root: defineComponent() },
       });`
    );
    writeFileSync(icon, '<svg/>');

    const discovered = discoverSchema({
      cwd: root,
      include: [
        './components/*.ts',
        { include: './icons/*.svg', name: (name) => `${name[0]!.toUpperCase()}${name.slice(1)}Icon` },
      ],
    });

    expect(discovered.components).toMatchObject([
      {
        kind: 'manifest',
        fileName: component,
        name: 'PlayButton',
        definition: { name: 'PlayButton', root: 'Root', parts: { Root: {} } },
      },
      { kind: 'file', fileName: icon, name: 'PlayIcon', definition: { name: 'PlayIcon' } },
    ]);
    expect(discovered.watchFiles).toEqual([component, icon].sort());
  });
});
