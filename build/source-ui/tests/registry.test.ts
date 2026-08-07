import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSkinArtifactGraph } from '../../../packages/skins/scripts/build-artifact-graph.ts';
import { createRegistryCatalog, type RegistryOutputManifest, type RegistryTarget } from '../registry.ts';

const targets = [
  { framework: 'react', style: 'tailwind' },
  { framework: 'react', style: 'css' },
  { framework: 'html', style: 'tailwind' },
  { framework: 'html', style: 'css' },
] as const satisfies readonly RegistryTarget[];

describe('createRegistryCatalog', () => {
  for (const target of targets) {
    it(`creates the ${target.framework}/${target.style} catalog from the artifact graph`, async () => {
      const { graph } = await buildSkinArtifactGraph();
      const output = outputManifest(
        graph.artifacts.map((artifact) => artifact.id),
        target.framework
      );
      const catalog = createRegistryCatalog(graph, { target, output, ref: 'eject/11-registry-catalog' });

      assert.deepEqual(
        catalog.items.map((item) => item.name),
        [
          `${target.framework}/${target.style}/default-video-controls`,
          `${target.framework}/${target.style}/fullscreen-button`,
          `${target.framework}/${target.style}/play-button`,
          `${target.framework}/${target.style}/seek-button`,
          `${target.framework}/${target.style}/time-slider`,
          `${target.framework}/${target.style}/volume-popover`,
          `${target.framework}/${target.style}/volume-slider`,
        ]
      );
      assert.deepEqual(catalog.items[0]?.registryDependencies, [
        `videojs/v10/${target.framework}/${target.style}/fullscreen-button#eject/11-registry-catalog`,
        `videojs/v10/${target.framework}/${target.style}/play-button#eject/11-registry-catalog`,
        `videojs/v10/${target.framework}/${target.style}/seek-button#eject/11-registry-catalog`,
        `videojs/v10/${target.framework}/${target.style}/time-slider#eject/11-registry-catalog`,
        `videojs/v10/${target.framework}/${target.style}/volume-popover#eject/11-registry-catalog`,
      ]);
      assert.deepEqual(catalog.items[0]?.meta, {
        framework: target.framework,
        style: target.style,
        ownership: 'source',
      });
    });
  }

  it('keeps internal helpers out of the catalog while including their output', async () => {
    const { graph } = await buildSkinArtifactGraph();
    const output = outputManifest(
      graph.artifacts.map((artifact) => artifact.id),
      'react'
    );
    const catalog = createRegistryCatalog(graph, {
      target: { framework: 'react', style: 'css' },
      output,
    });

    assert.equal(
      catalog.items.some((item) => item.name.endsWith('/button-tooltip')),
      false
    );
    assert.equal(
      catalog.items.some((item) => item.name.endsWith('/mute-button')),
      false
    );
    assert.deepEqual(catalog.items.find((item) => item.name.endsWith('/play-button'))?.files, [
      {
        path: 'registry/react/button-tooltip.tsx',
        type: 'registry:component',
        target: '@ui/videojs/button-tooltip.tsx',
      },
      {
        path: 'registry/react/play-button.tsx',
        type: 'registry:component',
        target: '@ui/videojs/play-button.tsx',
      },
    ]);
  });
});

function outputManifest(artifactIds: readonly string[], framework: 'html' | 'react'): RegistryOutputManifest {
  const extension = framework === 'react' ? 'tsx' : 'html';
  return {
    artifacts: Object.fromEntries(
      artifactIds.map((id) => [
        id,
        [
          {
            path: `registry/${framework}/${id}.${extension}`,
            type: 'registry:component' as const,
            target: `@ui/videojs/${id}.${extension}`,
          },
        ],
      ])
    ),
    dependencies: [framework === 'react' ? '@videojs/react' : '@videojs/html'],
  };
}
