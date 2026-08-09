import { describe, expect, it } from 'vitest';
import { loadSkinManifest, skinsRoot } from '../load';
import { createSourceOutputFile, generateSource, sourceEntryName } from '../source-output';

describe('generateSource', () => {
  it('applies a framework emitter and derives layout from Skin item type', async () => {
    const manifest = await loadSkinManifest();
    const output = await generateSource(
      manifest,
      { rootDir: skinsRoot, itemNames: ['default-video', 'play-button'] },
      {
        outputEntryName: sourceEntryName,
        async emitItem(context) {
          return [createSourceOutputFile(context.entryFile, `import '@fixture/runtime';`)];
        },
      }
    );

    expect(Object.keys(output.items)).toEqual(['default-video', 'play-button']);
    expect(output.items['default-video']?.[0]?.path).toBe('skin.tsx');
    expect(output.items['play-button']?.[0]?.path).toBe('components/play-button/play-button.tsx');
    expect(output.dependencies['play-button']).toEqual(['@fixture/runtime']);
  });
});
