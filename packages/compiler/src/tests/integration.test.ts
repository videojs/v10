import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { compile } from '..';
import { anyTag, byTag, childAsProp, hasChild, jsx, replace } from '../jsx';
import type { ImportRule } from '../transforms';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skinSource = resolve(__dirname, 'fixtures/video-skin.tsx');

/**
 * End-to-end smoke test: feed a representative constrained-JSX video skin
 * (vendored under `fixtures/`) through `compile()` with the same shape
 * a package build hook uses, and sanity-check the output's structural
 * shape. Snapshot-style assertions intentionally use `.toContain` over a full
 * snapshot to keep the test resilient to incidental whitespace differences
 * from the TS printer.
 */
describe('integration: default/video skin → JSX', () => {
  const source = readFileSync(skinSource, 'utf8');
  let code = '';

  const imports: Record<string, ImportRule> = {
    '@fixture/components': (name) => ({
      source: `./src/ui/${name.replace(/^[A-Z]/, (m) => m.toLowerCase()).replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`,
      name,
    }),
    '@fixture/icons/components': '@fixture/icons/jsx',
    '../tailwind': '@videojs/skins/default/tailwind',
  };

  beforeAll(async () => {
    const result = await compile(source, {
      config: {
        target: jsx({
          imports,
          transforms: [
            replace({
              match: byTag('Popover.Root', {
                when: hasChild(byTag('Popover.Trigger', { when: hasChild(byTag('MuteButton')) })),
              }),
              with: { source: './volume-popover', name: 'VolumePopover' },
              mapChildren: () => [],
            }),
            childAsProp({ match: anyTag(['Tooltip.Trigger', 'Popover.Trigger']), prop: 'render' }),
          ],
        }),
      },
    });
    code = result.code;
  });

  it('rewrites component imports to per-identifier UI sources', () => {
    expect(code).toMatch(/import \{ PlayButton \} from "\.\/src\/ui\/play-button"/);
    // MuteButton lives under the volume Popover.Root subtree, which is replaced
    // wholesale by VolumePopover — its import is correctly dropped by the
    // unused-imports cleanup pass.
    expect(code).not.toMatch(/import \{ MuteButton \}/);
  });

  it('rewrites icon component imports', () => {
    expect(code).toContain('@fixture/icons/jsx');
    expect(code).not.toContain('@fixture/icons/components');
  });

  it('substitutes the volume Popover.Root with VolumePopover', () => {
    expect(code).toContain('<VolumePopover');
    expect(code).toContain('import { VolumePopover }');
  });

  it('lifts Tooltip.Trigger / Popover.Trigger children into render props', () => {
    expect(code).toMatch(/<Tooltip\.Trigger render=\{<PlayButton/);
  });

  it('keeps unrelated relative tailwind import re-routed to the skins package', () => {
    expect(code).toContain('@videojs/skins/default/tailwind');
  });
});
