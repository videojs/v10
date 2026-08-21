import MagicString from 'magic-string';
import type { OutputAsset, OutputChunk, Plugin, RolldownOutput } from 'rolldown';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';

import { viteOxcPlugin } from '../oxc';

const ENTRY_ID = 'vite-oxc-fixture.js';

describe('viteOxcPlugin', () => {
  it('uses JavaScript MagicString fallback and returns its source map', async () => {
    let usedFallback = false;
    const transform: Plugin = {
      name: 'vite-oxc-transform',
      transform(code, id, meta) {
        if (id !== ENTRY_ID || !meta.magicString) return null;

        usedFallback = meta.magicString instanceof MagicString;
        const start = code.indexOf(`'before'`);
        meta.magicString.overwrite(start, start + 8, `'after'`);
        return { code: meta.magicString };
      },
    };
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      plugins: [fixturePlugin(), viteOxcPlugin(transform)],
      build: {
        write: false,
        sourcemap: true,
        rolldownOptions: {
          input: ENTRY_ID,
          experimental: { nativeMagicString: true },
        },
      },
    });
    const outputs = (Array.isArray(result) ? result : [result]) as RolldownOutput[];
    const output = outputs.flatMap((result) => result.output);
    const chunk = output.find((item): item is OutputChunk => item.type === 'chunk');
    const map = output.find((item): item is OutputAsset => item.type === 'asset' && item.fileName.endsWith('.map'));
    const sourceMap = map ? (JSON.parse(String(map.source)) as { mappings: string; sources: string[] }) : undefined;

    expect(usedFallback).toBe(true);
    expect(chunk?.code).toContain('after');
    expect(sourceMap).toBeDefined();
    expect(sourceMap?.mappings).not.toBe('');
    expect(sourceMap?.sources.length).toBeGreaterThan(0);
  });
});

function fixturePlugin(): Plugin {
  return {
    name: 'vite-oxc-fixture',
    resolveId(id) {
      return id === ENTRY_ID ? id : null;
    },
    load(id) {
      return id === ENTRY_ID ? `globalThis.value = 'before';` : null;
    },
  };
}
