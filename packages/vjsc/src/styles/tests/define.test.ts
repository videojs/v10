import { describe, expect, it } from 'vite-plus/test';

import { getStyleDefinition, styles } from '../define';

describe('styles', () => {
  it('derives class names from the module prefix', () => {
    const references = styles({
      file: 'buttons.css',
      prefix: 'media-play-button',
      rules: {
        root: { utilities: 'group/play' },
        restartIcon: { utilities: 'scale-0' },
        preview: { thumbnail: { utilities: 'block' } },
      },
    });

    expect(references.root).toBe('media-play-button');
    expect(references.restartIcon).toBe('media-play-button-restart-icon');
    expect(references.preview.thumbnail).toBe('media-play-button-preview-thumbnail');
  });

  it('keeps an explicit class name over the derived one', () => {
    const references = styles({
      file: 'popups.css',
      prefix: 'media-dialog',
      rules: {
        root: { className: 'media-dialog-root', utilities: 'grid' },
        popup: { utilities: 'block' },
      },
    });

    expect(references.root).toBe('media-dialog-root');
    expect(references.popup).toBe('media-dialog-popup');
    expect(getStyleDefinition(references)?.prefix).toBe('media-dialog');
  });

  it('rejects rules with neither a class name nor a prefix', () => {
    expect(() => styles({ file: 'buttons.css', rules: { root: { utilities: 'grid' } } })).toThrow(
      'needs a `className` or a module `prefix`'
    );
  });
});
