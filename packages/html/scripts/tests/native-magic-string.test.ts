import { type OutputAsset, type OutputChunk, type Plugin, RolldownMagicString, rolldown } from 'rolldown';
import { describe, expect, it } from 'vite-plus/test';

import { CDN_I18N_REGISTRY, cdnI18nExternalPlugin } from '../../../../build/plugins/cdn-i18n-external-plugin';
import { inlineTemplatePlugin } from '../../../../build/plugins/inline-template-plugin';

const ENTRY_ID = 'native-magic-string-fixture.js';

describe('inlineTemplatePlugin', () => {
  it('returns the host MagicString directly', () => {
    const source = 'export const template = /*html*/ `<div>  </div>`;';
    const magicString = new RolldownMagicString(source);
    const result = inlineTemplatePlugin().transform?.(source, 'fixture.ts', { magicString });

    expect(result?.code).toBe(magicString);
    expect(result?.map).toBeUndefined();
  });

  it('returns native edits with a composed source map', async () => {
    const { chunk, map } = await build(
      `export const template = /*html*/ \`
        <div>
          <span></span>
        </div>
      \`;`,
      inlineTemplatePlugin()
    );

    expect(chunk.code).toContain('`<div><span></span></div>`');
    expect(map.mappings).not.toBe('');
    expect(map.sources.length).toBeGreaterThan(0);
  });

  it('fails clearly when native MagicString is unavailable', () => {
    const source = 'export const template = /*html*/ `<div>  </div>`;';

    expect(() => inlineTemplatePlugin().transform?.(source, 'fixture.ts')).toThrow(
      'inline-template requires experimental.nativeMagicString: true.'
    );
  });
});

describe('cdnI18nExternalPlugin', () => {
  it('returns the host render-chunk MagicString directly', () => {
    const source = `export { getI18n } from "${CDN_I18N_REGISTRY}";`;
    const magicString = new RolldownMagicString(source);
    const result = cdnI18nExternalPlugin({ prod: true }).renderChunk?.(
      source,
      { fileName: 'media/video.js' },
      undefined,
      { magicString }
    );

    expect(result?.code).toBe(magicString);
    expect(result?.map).toBeUndefined();
  });

  it('returns native render-chunk edits with a composed source map', async () => {
    const { chunk, map } = await build(
      `import { getI18n } from '@videojs/core/i18n'; globalThis.getI18n = getI18n;`,
      cdnI18nExternalPlugin({ prod: true })
    );

    expect(chunk.code).toContain('from "./i18n.js"');
    expect(chunk.code).not.toContain(CDN_I18N_REGISTRY);
    expect(map.mappings).not.toBe('');
    expect(map.sources.length).toBeGreaterThan(0);
  });

  it('fails clearly when native render metadata is unavailable', () => {
    const source = `export { getI18n } from "${CDN_I18N_REGISTRY}";`;

    expect(() => cdnI18nExternalPlugin({ prod: true }).renderChunk?.(source, { fileName: 'media/video.js' })).toThrow(
      'cdn-i18n-external requires experimental.nativeMagicString: true.'
    );
  });
});

interface SourceMapOutput {
  readonly mappings: string;
  readonly sources: string[];
}

async function build(source: string, plugin: Plugin): Promise<{ chunk: OutputChunk; map: SourceMapOutput }> {
  const bundle = await rolldown({
    input: ENTRY_ID,
    experimental: { nativeMagicString: true },
    plugins: [fixturePlugin(source), plugin],
  });
  const output = await bundle.generate({ format: 'es', sourcemap: true });
  const chunk = output.output.find((item): item is OutputChunk => item.type === 'chunk');
  const map = output.output.find(
    (item): item is OutputAsset => item.type === 'asset' && item.fileName.endsWith('.map')
  );

  if (!chunk) throw new Error('Expected fixture build to emit a chunk.');

  if (!map) throw new Error('Expected fixture build to emit a source map.');

  return { chunk, map: JSON.parse(String(map.source)) as SourceMapOutput };
}

function fixturePlugin(source: string): Plugin {
  return {
    name: 'native-magic-string-fixture',
    resolveId(id) {
      return id === ENTRY_ID ? id : null;
    },
    load(id) {
      return id === ENTRY_ID ? source : null;
    },
  };
}
