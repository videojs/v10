import { type OutputChunk, type Plugin, rolldown } from 'rolldown';
import { describe, expect, it } from 'vitest';

import { componentMetaPlugin, editableSourcePlugin, readVjscMeta, readVjscSource } from '..';

const MODULE_ID = '\0fixture.tsx?target=react';

describe('componentMetaPlugin', () => {
  it('uses the Rolldown AST and MagicString while preserving editable source', async () => {
    const result = await build(
      `export const meta = { name: 'poster', type: 'component', flags: ['visual'], priority: -1 } as const satisfies { name: string }, retained = 42;\nexport const value = retained;`
    );

    expect(readVjscMeta(result.meta)?.component).toEqual({
      name: 'poster',
      type: 'component',
      flags: ['visual'],
      priority: -1,
    });
    expect(readVjscSource(result.meta)).not.toContain('const meta');
    expect(readVjscSource(result.meta)).toContain('export const retained = 42;');
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
    plugins: [fixturePlugin(source), componentMetaPlugin(), editableSourcePlugin(), inspect],
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
