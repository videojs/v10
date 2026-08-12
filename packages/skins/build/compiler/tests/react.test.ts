import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { transform } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import { loadSkinStyleManifest } from '../../styles/manifest';
import { createCompilerReactConfig } from '../react';

const canonicalRoot = resolve(import.meta.dirname, '../../../canonical');
const styleFiles = [
  resolve(canonicalRoot, 'styles/components/button.tailwind.ts'),
  resolve(canonicalRoot, 'styles/components/popup.tailwind.ts'),
];

describe('createCompilerReactConfig', () => {
  it('emits canonical button composition with public React imports', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/seek-button.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({ style: 'tailwind', styles: await loadSkinStyleManifest(styleFiles) }),
      configDir: dirname(filename),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain("import type { SeekButtonProps } from '@videojs/core'");
    expect(result.code).toContain('import { SeekButton as SeekButtonPrimitive } from "@videojs/react"');
    expect(result.code).toContain('import { SeekIcon } from "@videojs/react/icons"');
    expect(result.code).toContain('<span className="tabular-nums">');
    expect(result.code).not.toContain('button.tailwind');
  });

  it('uses public primitive props for the tooltip composition', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/button-tooltip.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({ style: 'tailwind', styles: await loadSkinStyleManifest(styleFiles) }),
    });

    expect(result.code).toContain('interface ButtonTooltipProps extends TooltipPrimitive.RootProps');
    expect(result.code).toContain('children: ReactElement');
    expect(result.code).not.toContain('Parameters<typeof TooltipPrimitive.Root>');
  });

  it('allows a projection to resolve generated React imports', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/seek-button.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({
        style: 'tailwind',
        styles: await loadSkinStyleManifest(styleFiles),
        resolveImport(reference) {
          if (reference.source === '@videojs/react') return { ...reference, source: '@/ui/seek-button' };
          if (reference.source === '@videojs/react/icons') return { ...reference, source: '@/icons' };
          return reference;
        },
      }),
    });

    expect(result.code).toContain('import { SeekButton as SeekButtonPrimitive } from "@/ui/seek-button"');
    expect(result.code).toContain('import { SeekIcon } from "@/icons"');
  });
});
