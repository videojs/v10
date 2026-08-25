import MagicString from 'magic-string';
import type { OutputAsset, OutputChunk, Plugin, RolldownOutput } from 'rolldown';
import { build } from 'vite';
import { describe, expect, it } from 'vite-plus/test';

import { viteOxcPlugin } from '../oxc';

const ENTRY_ID = 'vite-oxc-fixture.js';

describe('viteOxcPlugin', () => {
  it('supplies the AST and MagicString metadata omitted by Vite', async () => {
    let topLevelHasOxcMetadata = true;
    let rolldownOptionsHasOxcMetadata = true;
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
      plugins: [
        fixturePlugin(),
        metadataProbe((hasMetadata) => {
          topLevelHasOxcMetadata = hasMetadata;
        }),
        viteOxcPlugin(transform),
      ],
      build: {
        write: false,
        sourcemap: true,
        rolldownOptions: {
          input: ENTRY_ID,
          experimental: { nativeMagicString: true },
          plugins: [
            metadataProbe((hasMetadata) => {
              rolldownOptionsHasOxcMetadata = hasMetadata;
            }),
          ],
        },
      },
    });
    const outputs = (Array.isArray(result) ? result : [result]) as RolldownOutput[];
    const output = outputs.flatMap((result) => result.output);
    const chunk = output.find((item): item is OutputChunk => item.type === 'chunk');
    const map = output.find((item): item is OutputAsset => item.type === 'asset' && item.fileName.endsWith('.map'));
    const sourceMap = map ? (JSON.parse(String(map.source)) as { mappings: string; sources: string[] }) : undefined;

    expect(topLevelHasOxcMetadata).toBe(false);
    expect(rolldownOptionsHasOxcMetadata).toBe(false);
    expect(usedFallback).toBe(true);
    expect(chunk?.code).toContain('after');
    expect(sourceMap).toBeDefined();
    expect(sourceMap?.mappings).not.toBe('');
    expect(sourceMap?.sources.length).toBeGreaterThan(0);
  });

  it('reports positioned transform errors against the authored source', async () => {
    const transform: Plugin = {
      name: 'vite-oxc-positioned-error',
      transform(code, id) {
        if (id !== ENTRY_ID) return null;

        throw Object.assign(new Error('Failed to transform fixture.'), { pos: code.indexOf(`'before'`) });
      },
    };

    await expect(
      build({
        configFile: false,
        logLevel: 'silent',
        plugins: [fixturePlugin(), viteOxcPlugin(transform)],
        build: {
          write: false,
          rolldownOptions: { input: ENTRY_ID },
        },
      })
    ).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          plugin: 'vite-oxc-positioned-error',
          id: ENTRY_ID,
          loc: expect.objectContaining({ line: 1 }),
          frame: expect.stringContaining(`globalThis.value = 'before';`),
        }),
      ],
    });
  });
});

function metadataProbe(record: (hasMetadata: boolean) => void): Plugin {
  return {
    name: 'vite-oxc-metadata-probe',
    transform(_code, id, options) {
      if (id === ENTRY_ID) {
        record('ast' in (options ?? {}) || 'magicString' in (options ?? {}));
      }

      return null;
    },
  };
}

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
