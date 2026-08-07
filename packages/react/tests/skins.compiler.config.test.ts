import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compile } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import reactSourceConfig from '../skins.compiler.config';

const canonicalRoot = resolve(import.meta.dirname, '../../skins/canonical');
const generatedRoot = resolve(import.meta.dirname, '../generated/skins');

async function compileCanonical(relativePath: string) {
  const filename = resolve(canonicalRoot, relativePath);
  const source = await readFile(filename, 'utf8');
  return compile(source, {
    filename,
    config: reactSourceConfig,
    configDir: generatedRoot,
    outputFile: resolve(generatedRoot, relativePath),
  });
}

describe('reactSourceConfig', () => {
  it('lowers canonical button composition to public React imports', async () => {
    const result = await compileCanonical('components/buttons/seek-button.skin.tsx');

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('import type { SeekButtonProps } from "@videojs/react"');
    expect(result.code).toContain('import { SeekButton as SeekButtonPrimitive } from "@videojs/react"');
    expect(result.code).toContain('import { SeekIcon } from "../../icons"');
    expect(result.code).toContain('<span className={seekLabel}>');
    expect(result.code).not.toContain('@videojs/core/components');
    expect(result.code).not.toContain('@videojs/icons/components');
  });

  it('lowers button tooltip children to the React render prop', async () => {
    const result = await compileCanonical('components/buttons/button-tooltip.skin.tsx');

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('from "@videojs/react"');
    expect(result.code).toContain('<TooltipPrimitive.Trigger render={children}/>');
    expect(result.code).not.toContain('<TooltipPrimitive.Trigger>{children}</TooltipPrimitive.Trigger>');
  });
});
