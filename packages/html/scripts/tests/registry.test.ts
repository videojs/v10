import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { loadRegistry, type RegistryStyle, skinsRoot } from '../../../skins/registry/index.ts';
import { generateHtmlRegistry } from '../registry/emit-html.ts';

describe('generateHtmlRegistry', () => {
  it('emits one complete HTML Skin block with exact registrations', async () => {
    const output = await sourceOutput('tailwind');
    const files = output.items['default-video'] ?? [];
    const entry = files.find((file) => file.path.endsWith('skin.html'));
    const elements = files.find((file) => file.path === 'elements.ts');

    assert.match(entry?.content ?? '', /<media-play-button/);
    assert.match(entry?.content ?? '', /<media-seek-button[^>]+seconds="-10"/);
    assert.match(entry?.content ?? '', /<media-volume-slider[^>]+orientation="vertical"/);
    assert.match(entry?.content ?? '', /grid size-media-control/);
    assert.doesNotMatch(entry?.content ?? '', /\bimport\b|\bexport\b|button\.tailwind/);
    assert.match(elements?.content ?? '', /^import '@videojs\/html\/icons\/element';/);
    assert.match(elements?.content ?? '', /@videojs\/html\/ui\/play-button/);
    assert.match(elements?.content ?? '', /@videojs\/html\/ui\/volume-slider/);
    assert.deepEqual(output.dependencies['default-video'], ['@videojs/html']);
  });

  it('extracts the complete HTML composition to semantic vanilla CSS', async () => {
    const output = await sourceOutput('css');
    const files = output.items['default-video'] ?? [];
    const entry = files.find((file) => file.path.endsWith('skin.html'));
    const styles = files.find((file) => file.path === 'styles.css');

    assert.match(entry?.content ?? '', /class="media-skin media-theme-default"/);
    assert.match(entry?.content ?? '', /class="media-play-button"/);
    assert.doesNotMatch(entry?.content ?? '', /grid|size-media-control|group\/play/);
    assert.match(styles?.content ?? '', /\.media-skin\s*\{/);
    assert.match(styles?.content ?? '', /\.media-slider\s*\{/);
    assert.doesNotMatch(styles?.content ?? '', /\.flex|\.grid|group-data-/);
    assert.doesNotMatch(styles?.content ?? '', /--tw-|@layer properties/);
  });

  it('imports selected icon sets from the public element entry point', async () => {
    const registry = await loadRegistry();
    const output = await generateHtmlRegistry(registry, {
      rootDir: skinsRoot,
      style: 'tailwind',
      iconSet: 'minimal',
      itemNames: ['default-video'],
    });
    const source = output.items['default-video']?.map((file) => file.content).join('\n') ?? '';
    assert.match(source, /import ['"]@videojs\/html\/icons\/element\/minimal['"]/);
  });

  for (const style of ['tailwind', 'css'] as const) {
    it(`is deterministic for ${style}`, async () => {
      assert.deepEqual(await sourceOutput(style), await sourceOutput(style));
    });
  }
});

async function sourceOutput(style: RegistryStyle) {
  const registry = await loadRegistry();
  return generateHtmlRegistry(registry, {
    rootDir: skinsRoot,
    style,
    itemNames: ['default-video'],
  });
}
