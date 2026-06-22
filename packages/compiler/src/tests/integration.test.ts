import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { compile, type ImportRule, react } from '..';
import { anyTag, byTag, hasChild } from '../matchers';
import { childAsProp, replace } from '../react';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skinSource = resolve(__dirname, 'fixtures/video-skin.tsx');

/**
 * End-to-end smoke test: feed a representative constrained-JSX video skin
 * (vendored under `fixtures/`) through `compile()` with the same shape
 * `@videojs/react`'s build hook uses, and sanity-check the output's structural
 * shape. Snapshot-style assertions intentionally use `.toContain` over a full
 * snapshot to keep the test resilient to incidental whitespace differences
 * from the TS printer.
 */
describe('integration: default/video skin → React', () => {
  const source = readFileSync(skinSource, 'utf8');
  let code = '';

  const imports: Record<string, ImportRule> = {
    '@videojs/core/components': (name) => ({
      source: `./src/ui/${name.replace(/^[A-Z]/, (m) => m.toLowerCase()).replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`,
      name,
    }),
    '@videojs/icons/components': '@videojs/icons/react',
    '../tailwind': '@videojs/skins/default/tailwind',
  };

  beforeAll(async () => {
    const result = await compile(source, {
      config: {
        target: react({
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

  it('rewrites @videojs/core/components imports to per-identifier UI sources', () => {
    expect(code).toMatch(/import \{ PlayButton \} from "\.\/src\/ui\/play-button"/);
    // MuteButton lives under the volume Popover.Root subtree, which is replaced
    // wholesale by VolumePopover — its import is correctly dropped by the
    // unused-imports cleanup pass.
    expect(code).not.toMatch(/import \{ MuteButton \}/);
  });

  it('rewrites @videojs/icons/components to @videojs/icons/react', () => {
    expect(code).toContain('@videojs/icons/react');
    expect(code).not.toContain('@videojs/icons/components');
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
