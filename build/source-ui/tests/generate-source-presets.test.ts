import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSourcePresetFiles } from '../generate-source-presets.ts';

describe('createSourcePresetFiles', () => {
  it('materializes complete framework outputs without registry files', async () => {
    const files = await createSourcePresetFiles();
    const paths = [...files.keys()];

    assert.equal(paths.includes('packages/react/src/__generated__/skins/default-video/css/video-controls.tsx'), true);
    assert.equal(
      paths.includes('packages/react/src/__generated__/skins/default-video/css/play-button/play-button.tsx'),
      true
    );
    assert.equal(paths.includes('packages/html/src/__generated__/skins/default-video/css/video-controls.html'), true);
    assert.equal(
      paths.some((path) => path.includes('packages/html/src/__generated__/skins/default-video/css/play-button/')),
      false
    );
    assert.equal(
      paths.some((path) => path.includes('/registry')),
      false
    );

    const reactCss = files.get('packages/react/src/__generated__/skins/default-video/css/video-controls.tsx') ?? '';
    const reactTailwind =
      files.get('packages/react/src/__generated__/skins/default-video/tailwind/video-controls.tsx') ?? '';
    const htmlCss = files.get('packages/html/src/__generated__/skins/default-video/css/styles.css') ?? '';
    assert.match(reactCss, /from '\.\/play-button\/play-button'/);
    assert.match(reactTailwind, /^import '\.\/styles\/tailwind\.css';/);
    assert.match(htmlCss, /^@import '\.\/styles\/base\.css';/);
  });
});
