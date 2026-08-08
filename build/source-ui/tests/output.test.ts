import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSkinArtifactGraph, skinsRoot } from '../../../packages/skins/scripts/build-artifact-graph.ts';
import { createSourceOutput, type SourceTarget } from '../output.ts';

const targets = [
  { framework: 'react', style: 'tailwind' },
  { framework: 'react', style: 'css' },
  { framework: 'html', style: 'tailwind' },
  { framework: 'html', style: 'css' },
] as const satisfies readonly SourceTarget[];

describe('createSourceOutput', () => {
  it('emits editable React Tailwind source without canonical token modules', async () => {
    const output = await sourceOutput({ framework: 'react', style: 'tailwind' });
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

  it('emits one complete HTML Skin block with exact registrations', async () => {
    const output = await sourceOutput({ framework: 'html', style: 'tailwind' });
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

  it('extracts React utility authoring to semantic vanilla CSS', async () => {
    const output = await sourceOutput({ framework: 'react', style: 'css' });
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

  it('extracts the complete HTML composition to semantic vanilla CSS', async () => {
    const output = await sourceOutput({ framework: 'html', style: 'css' });
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
    const output = await sourceOutput({ framework: 'html', style: 'tailwind' });
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

  it('imports selected icon sets from framework public entry points', async () => {
    const { graph, diagnostics } = await buildSkinArtifactGraph();
    assert.deepEqual(diagnostics, []);
    const [react, html] = await Promise.all([
      createSourceOutput(graph, {
        rootDir: skinsRoot,
        target: { framework: 'react', style: 'tailwind' },
        iconSet: 'minimal',
      }),
      createSourceOutput(graph, {
        rootDir: skinsRoot,
        target: { framework: 'html', style: 'tailwind' },
        iconSet: 'minimal',
      }),
    ]);

    const reactSource = react.artifacts['play-button']?.map((file) => file.content).join('\n') ?? '';
    const htmlSource = html.artifacts['default-video-controls']?.map((file) => file.content).join('\n') ?? '';
    assert.match(reactSource, /from ['"]@videojs\/react\/icons\/minimal['"]/);
    assert.match(htmlSource, /import ['"]@videojs\/html\/icons\/element\/minimal['"]/);
  });

  for (const target of targets) {
    it(`is deterministic for ${target.framework}/${target.style}`, async () => {
      assert.deepEqual(await sourceOutput(target), await sourceOutput(target));
    });
  }
});

async function sourceOutput(target: SourceTarget) {
  const { graph, diagnostics } = await buildSkinArtifactGraph();
  assert.deepEqual(diagnostics, []);
  const output = await createSourceOutput(graph, { rootDir: skinsRoot, target });
  assertNoPrivateImports(Object.values(output.artifacts).flat());
  return output;
}

function assertNoPrivateImports(files: readonly { content: string }[]): void {
  const source = files.map((file) => file.content).join('\n');
  assert.doesNotMatch(source, /@videojs\/(?:core|icons)\/components|@videojs\/jsx/);
}
