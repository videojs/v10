import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { buildSkinArtifactGraph, skinsRoot } from '../../../skins/scripts/build-artifact-graph.ts';
import type { SourceStyle } from '../../../skins/scripts/source-presets/output.ts';
import { createReactSourceOutput } from '../source-presets/output.ts';

describe('createReactSourceOutput', () => {
  it('emits editable Tailwind source without canonical token modules', async () => {
    const output = await sourceOutput('tailwind');
    const files = output.artifacts['play-button'] ?? [];
    const entry = files.find((file) => file.target.endsWith('/play-button.tsx'));

    assert.deepEqual(
      files.map((file) => file.target),
      [
        'components/videojs/play-button/play-button.tsx',
        'components/videojs/styles/base.css',
        'components/videojs/styles/tailwind.css',
        'components/videojs/styles/themes/default.css',
      ]
    );
    assert.match(entry?.content ?? '', /^import '\.\.\/styles\/tailwind\.css';/);
    assert.match(entry?.content ?? '', /from "@videojs\/react"/);
    assert.match(entry?.content ?? '', /from "@videojs\/react\/icons"/);
    assert.match(entry?.content ?? '', /from ["']\.\.\/button-tooltip\/button-tooltip["']/);
    assert.match(entry?.content ?? '', /grid size-media-control/);
    assert.doesNotMatch(entry?.content ?? '', /button\.tailwind|button\.play|@videojs\/core\/components/);
    assert.deepEqual(output.dependencies['play-button'], ['@videojs/react']);
  });

  it('extracts utilities to semantic vanilla CSS', async () => {
    const output = await sourceOutput('css');
    const files = output.artifacts['play-button'] ?? [];
    const entry = files.find((file) => file.target.endsWith('/play-button.tsx'));
    const styles = files.find((file) => file.target.endsWith('/play-button/styles.css'));
    const support = files.find((file) => file.target.endsWith('/styles/support.css'));

    assert.match(entry?.content ?? '', /^import '\.\/styles\.css';/);
    assert.match(entry?.content ?? '', /className="media-play-button"/);
    assert.doesNotMatch(entry?.content ?? '', /grid|size-media-control|button\.tailwind/);
    assert.match(styles?.content ?? '', /@import '\.\.\/styles\/support\.css';/);
    assert.match(styles?.content ?? '', /\.media-play-button\s*\{/);
    assert.match(styles?.content ?? '', /\.media-play-button-icon-play/);
    assert.match(styles?.content ?? '', /\[data-paused\]/);
    assert.doesNotMatch(styles?.content ?? '', /\.grid|\.size-media-control|group-data-|@property|tailwindcss v/);
    assert.doesNotMatch(support?.content ?? '', /\.media-skin\s*\{/);
    assert.doesNotMatch(styles?.content ?? '', /var\(--(?:spacing|font-weight-semibold)\b/);
    assert.match(styles?.content ?? '', /var\(--media-/);
    assert.equal(support?.content.match(/tailwindcss v/g)?.length, 1);
    assert.equal(support?.content.match(/@layer properties\s*\{/g)?.length, 1);
    assert.equal(
      files.some((file) => file.target.endsWith('/tailwind.css') || file.target.endsWith('.tailwind.ts')),
      false
    );
  });

  it('imports selected icon sets from the public React entry point', async () => {
    const { graph, diagnostics } = await buildSkinArtifactGraph();
    assert.deepEqual(diagnostics, []);
    const output = await createReactSourceOutput(graph, {
      rootDir: skinsRoot,
      style: 'tailwind',
      iconSet: 'minimal',
      artifactIds: ['play-button'],
    });
    const source = output.artifacts['play-button']?.map((file) => file.content).join('\n') ?? '';
    assert.match(source, /from ['"]@videojs\/react\/icons\/minimal['"]/);
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
  const output = await createReactSourceOutput(graph, { rootDir: skinsRoot, style });
  const source = Object.values(output.artifacts)
    .flat()
    .map((file) => file.content)
    .join('\n');
  assert.doesNotMatch(source, /@videojs\/(?:core|icons)\/components|@videojs\/jsx/);
  return output;
}
