import { describe, expect, it } from 'vitest';
import { buildSkinArtifactGraph, skinsRoot } from '../build-artifact-graph';
import { createDefaultVideoSourcePreset } from '../source-presets/default-video';
import { createFrameworkSourceOutput, createSourceOutputFile, sourceEntryName } from '../source-presets/output';

describe('createDefaultVideoSourcePreset', () => {
  it('owns the canonical preset identity and complete artifact closure', async () => {
    const { graph, diagnostics } = await buildSkinArtifactGraph();
    expect(diagnostics).toEqual([]);

    expect(createDefaultVideoSourcePreset(graph)).toEqual({
      slug: 'default-video',
      rootArtifactId: 'default-video-controls',
      artifactIds: [
        'button-tooltip',
        'fullscreen-button',
        'play-button',
        'seek-button',
        'time-slider',
        'mute-button',
        'volume-slider',
        'volume-popover',
        'default-video-controls',
      ],
    });
  });
});

describe('createFrameworkSourceOutput', () => {
  it('applies an injected adapter without depending on a framework package', async () => {
    const { graph } = await buildSkinArtifactGraph();
    const output = await createFrameworkSourceOutput(
      graph,
      { rootDir: skinsRoot, style: 'tailwind', artifactIds: ['play-button'] },
      {
        framework: 'react',
        outputEntryName: (entry) => sourceEntryName(entry, 'react'),
        async emitArtifact(context) {
          return [createSourceOutputFile(context.options, context.entryFile, `import '@fixture/runtime';`)];
        },
      }
    );

    expect(Object.keys(output.artifacts)).toEqual(['play-button']);
    expect(output.artifacts['play-button']?.[0]?.target).toBe('components/videojs/play-button/play-button.tsx');
    expect(output.dependencies['play-button']).toEqual(['@fixture/runtime']);
  });
});
