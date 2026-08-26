import { type OutputChunk, type Plugin, rolldown } from 'rolldown';
import { describe, expect, it } from 'vite-plus/test';

import { componentMetaPlugin, readComponentMeta, readComponentSource } from '../component-meta';
import { componentSourcePlugin } from '../component-source';

const MODULE_ID = '\0fixture.tsx?target=react';

describe('componentMetaPlugin', () => {
  it('uses the Rolldown AST and MagicString while preserving editable source', async () => {
    const result = await build(
      `export const meta = { name: 'poster', type: 'component', flags: ['visual'], priority: -1 } as const satisfies { name: string }, retained = 42;\nexport const value = retained;`
    );

    expect(readComponentMeta(result.meta)).toEqual({
      name: 'poster',
      type: 'component',
      flags: ['visual'],
      priority: -1,
    });
    expect(readComponentSource(result.meta)).not.toContain('const meta');
    expect(readComponentSource(result.meta)).toContain('export const retained = 42;');
    expect(result.code).not.toContain('meta');
    expect(result.code).toContain('retained');
  });

  it('rejects metadata that requires evaluation', async () => {
    await expect(build(`const name = 'poster'; export const meta = { name };`)).rejects.toThrow(
      'must contain only static literal values'
    );
  });
});

async function build(source: string): Promise<{ code: string; meta: unknown }> {
  let meta: unknown;
  const inspect: Plugin = {
    name: 'fixture:inspect',
    buildEnd() {
      meta = this.getModuleInfo(MODULE_ID)?.meta;
    },
  };
  const bundle = await rolldown({
    input: 'fixture',
    experimental: { nativeMagicString: true },
    plugins: [fixturePlugin(source), componentMetaPlugin(), componentSourcePlugin(), inspect],
  });
  const output = await bundle.generate({ format: 'es' });
  const chunk = output.output.find((item): item is OutputChunk => item.type === 'chunk');
  if (!chunk) throw new Error('Fixture build did not emit a chunk.');

  return { code: chunk.code, meta };
}

function fixturePlugin(source: string): Plugin {
  return {
    name: 'fixture:module',
    resolveId(id) {
      return id === 'fixture' ? MODULE_ID : null;
    },
    load(id) {
      return id === MODULE_ID ? { code: source, moduleType: 'tsx' } : null;
    },
  };
}
