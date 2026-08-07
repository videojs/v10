import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSourcePresetFiles } from '../generate-source-presets.ts';

describe('createSourcePresetFiles', () => {
  it('materializes complete framework outputs without registry files', async () => {
    const files = await createSourcePresetFiles();
    const paths = [...files.keys()];

    assert.equal(
      paths.includes('packages/react/tests/fixtures/source-ui/css/default-video-controls/video-controls.tsx'),
      true
    );
    assert.equal(paths.includes('packages/react/tests/fixtures/source-ui/css/play-button/play-button.tsx'), true);
    assert.equal(
      paths.includes('packages/html/tests/fixtures/source-ui/css/default-video-controls/video-controls.html'),
      true
    );
    assert.equal(
      paths.some((path) => path.includes('packages/html/tests/fixtures/source-ui/css/play-button/')),
      false
    );
    assert.equal(
      paths.some((path) => path.includes('/registry')),
      false
    );
  });
});
