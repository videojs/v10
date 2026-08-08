import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { loadRegistry, type RegistryStyle, skinsRoot } from '../../../skins/registry/index.ts';
import { generateReactRegistry } from '../registry/emit-react.ts';

describe('generateReactRegistry', () => {
  it('emits editable Tailwind source without canonical token modules', async () => {
    const output = await sourceOutput('tailwind');
    const files = output.items['play-button'] ?? [];
    const entry = files.find((file) => file.path.endsWith('/play-button.tsx'));

    assert.deepEqual(
      files.map((file) => file.path),
      ['components/play-button/play-button.tsx', 'styles/base.css', 'styles/tailwind.css', 'styles/themes/default.css']
    );
    assert.match(entry?.content ?? '', /^import '\.\.\/\.\.\/styles\/tailwind\.css';/);
    assert.match(entry?.content ?? '', /from "@videojs\/react"/);
    assert.match(entry?.content ?? '', /from "@videojs\/react\/icons"/);
    assert.match(entry?.content ?? '', /from ["']\.\.\/button-tooltip\/button-tooltip["']/);
    assert.match(entry?.content ?? '', /grid size-media-control/);
    assert.doesNotMatch(entry?.content ?? '', /button\.tailwind|button\.play|@videojs\/core\/components/);
    assert.deepEqual(output.dependencies['play-button'], ['@videojs/react']);
  });

  it('extracts utilities to semantic vanilla CSS', async () => {
    const output = await sourceOutput('css');
    const files = output.items['play-button'] ?? [];
    const entry = files.find((file) => file.path.endsWith('/play-button.tsx'));
    const styles = files.find((file) => file.path.endsWith('/play-button/styles.css'));
    const support = files.find((file) => file.path.endsWith('/styles/support.css'));

    assert.match(entry?.content ?? '', /^import '\.\/styles\.css';/);
    assert.match(entry?.content ?? '', /className="media-play-button"/);
    assert.doesNotMatch(entry?.content ?? '', /grid|size-media-control|button\.tailwind/);
    assert.doesNotMatch(styles?.content ?? '', /support\.css/);
    assert.match(styles?.content ?? '', /\.media-play-button\s*\{/);
    assert.match(styles?.content ?? '', /\.media-play-button-icon-play/);
    assert.match(styles?.content ?? '', /\[data-paused\]/);
    assert.doesNotMatch(styles?.content ?? '', /\.grid|\.size-media-control|group-data-|@property|tailwindcss v/);
    assert.doesNotMatch(support?.content ?? '', /\.media-skin\s*\{/);
    assert.doesNotMatch(styles?.content ?? '', /var\(--(?:spacing|font-weight-semibold)\b/);
    assert.doesNotMatch(styles?.content ?? '', /--tw-/);
    assert.match(styles?.content ?? '', /var\(--media-/);
    assert.equal(support, undefined);
    assert.equal(
      files.some((file) => file.path.endsWith('/tailwind.css') || file.path.endsWith('.tailwind.ts')),
      false
    );
  });

  it('imports selected icon sets from the public React entry point', async () => {
    const registry = await loadRegistry();
    const output = await generateReactRegistry(registry, {
      rootDir: skinsRoot,
      style: 'tailwind',
      iconSet: 'minimal',
      itemNames: ['play-button'],
    });
    const source = output.items['play-button']?.map((file) => file.content).join('\n') ?? '';
    assert.match(source, /from ['"]@videojs\/react\/icons\/minimal['"]/);
  });

  for (const style of ['tailwind', 'css'] as const) {
    it(`is deterministic for ${style}`, async () => {
      assert.deepEqual(await sourceOutput(style), await sourceOutput(style));
    });
  }
});

async function sourceOutput(style: RegistryStyle) {
  const registry = await loadRegistry();
  const output = await generateReactRegistry(registry, { rootDir: skinsRoot, style });
  const source = Object.values(output.items)
    .flat()
    .map((file) => file.content)
    .join('\n');
  assert.doesNotMatch(source, /@videojs\/(?:core|icons)\/components|@videojs\/jsx/);
  return output;
}
