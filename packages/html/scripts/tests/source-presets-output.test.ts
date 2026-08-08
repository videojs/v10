import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { buildSkinArtifactGraph, skinsRoot } from '../../../skins/scripts/build-artifact-graph.ts';
import type { SourceStyle } from '../../../skins/scripts/source-presets/output.ts';
import { createHtmlSourceOutput } from '../source-presets/output.ts';

describe('createHtmlSourceOutput', () => {
  it('emits one complete HTML Skin block with exact registrations', async () => {
    const output = await sourceOutput('tailwind');
    const files = output.artifacts['default-video-controls'] ?? [];
    const entry = files.find((file) => file.target.endsWith('/video-controls.html'));
    const elements = files.find((file) => file.target.endsWith('/elements.ts'));

    assert.match(entry?.content ?? '', /<media-play-button/);
    assert.match(entry?.content ?? '', /<media-seek-button[^>]+seconds="-10"/);
    assert.match(entry?.content ?? '', /<media-volume-slider[^>]+orientation="vertical"/);
    assert.match(entry?.content ?? '', /grid size-media-control/);
    assert.doesNotMatch(entry?.content ?? '', /\bimport\b|\bexport\b|button\.tailwind/);
    assert.match(elements?.content ?? '', /^import '@videojs\/html\/icons\/element';/);
    assert.match(elements?.content ?? '', /@videojs\/html\/ui\/play-button/);
    assert.match(elements?.content ?? '', /@videojs\/html\/ui\/volume-slider/);
    assert.deepEqual(output.dependencies['default-video-controls'], ['@videojs/html']);
  });

  it('extracts the complete HTML composition to semantic vanilla CSS', async () => {
    const output = await sourceOutput('css');
    const files = output.artifacts['default-video-controls'] ?? [];
    const entry = files.find((file) => file.target.endsWith('/video-controls.html'));
    const styles = files.find((file) => file.target.endsWith('/default-video-controls/styles.css'));

    assert.match(entry?.content ?? '', /class="media-video-controls media-skin media-theme-default"/);
    assert.match(entry?.content ?? '', /class="media-play-button"/);
    assert.doesNotMatch(entry?.content ?? '', /grid|size-media-control|group\/play/);
    assert.match(styles?.content ?? '', /\.media-video-controls\s*\{/);
    assert.match(styles?.content ?? '', /\.media-slider-root\s*\{/);
    assert.doesNotMatch(styles?.content ?? '', /\.flex|\.grid|group-data-/);
  });

  it('keeps source emission independent of registry paths and file types', async () => {
    const output = await sourceOutput('tailwind');
    const files = Object.values(output.artifacts).flat();

    assert.equal(
      files.every((file) => file.path.startsWith('generated/html/tailwind/')),
      true
    );
    assert.equal(
      files.every((file) => file.kind === 'source' || file.kind === 'style'),
      true
    );
    assert.equal(
      files.some((file) => file.path.includes('registry')),
      false
    );
  });

  it('imports selected icon sets from the public element entry point', async () => {
    const { graph, diagnostics } = await buildSkinArtifactGraph();
    assert.deepEqual(diagnostics, []);
    const output = await createHtmlSourceOutput(graph, {
      rootDir: skinsRoot,
      style: 'tailwind',
      iconSet: 'minimal',
      artifactIds: ['default-video-controls'],
    });
    const source = output.artifacts['default-video-controls']?.map((file) => file.content).join('\n') ?? '';
    assert.match(source, /import ['"]@videojs\/html\/icons\/element\/minimal['"]/);
  });

  for (const style of ['tailwind', 'css'] as const) {
    it(`is deterministic for ${style}`, async () => {
      assert.deepEqual(await sourceOutput(style), await sourceOutput(style));
    });
  }
});

async function sourceOutput(style: SourceStyle) {
  const { graph, diagnostics } = await buildSkinArtifactGraph();
  assert.deepEqual(diagnostics, []);
  return createHtmlSourceOutput(graph, {
    rootDir: skinsRoot,
    style,
    artifactIds: ['default-video-controls'],
  });
}
