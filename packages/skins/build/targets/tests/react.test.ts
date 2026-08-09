import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { compile } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import { createReactSkinSourceConfig } from '../react';

const canonicalRoot = resolve(import.meta.dirname, '../../../canonical');

describe('createReactSkinSourceConfig', () => {
  it('emits canonical button composition with public React imports', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/seek-button.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await compile(source, {
      filename,
      config: createReactSkinSourceConfig({ style: 'tailwind' }),
      configDir: dirname(filename),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('import { SeekButton as SeekButtonPrimitive } from "@videojs/react"');
    expect(result.code).toContain('import { SeekIcon } from "@videojs/react/icons"');
    expect(result.code).toContain('<span className="tabular-nums">');
    expect(result.code).not.toContain('button.tailwind');
  });

  it('uses public primitive props for the tooltip composition', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/button-tooltip.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await compile(source, {
      filename,
      config: createReactSkinSourceConfig({ style: 'tailwind' }),
    });

    expect(result.code).toContain('interface ButtonTooltipProps extends TooltipPrimitive.RootProps');
    expect(result.code).toContain('children: ReactElement');
    expect(result.code).not.toContain('Parameters<typeof TooltipPrimitive.Root>');
  });
});
