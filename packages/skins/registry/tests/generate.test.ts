import { describe, expect, it } from 'vitest';
import { createRegistryOutputFile, generateRegistry, sourceEntryName } from '../generate';
import { loadRegistry, skinsRoot } from '../load';

describe('generateRegistry', () => {
  it('applies a framework emitter and derives layout from registry item type', async () => {
    const registry = await loadRegistry();
    const output = await generateRegistry(
      registry,
      { rootDir: skinsRoot, style: 'tailwind', itemNames: ['default-video', 'play-button'] },
      {
        framework: 'react',
        outputEntryName: (source) => sourceEntryName(source, 'react'),
        async emitItem(context) {
          return [createRegistryOutputFile(context.entryFile, `import '@fixture/runtime';`)];
        },
      }
    );

    expect(Object.keys(output.items)).toEqual(['default-video', 'play-button']);
    expect(output.items['default-video']?.[0]?.path).toBe('skin.tsx');
    expect(output.items['play-button']?.[0]?.path).toBe('components/play-button/play-button.tsx');
    expect(output.dependencies['play-button']).toEqual(['@fixture/runtime']);
  });
});
