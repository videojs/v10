import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCatalogStyles, resolveCatalog } from 'vjsc/catalog';
import { canonicalRoot, loadSkinCatalog } from '../catalog';

describe('skinCatalog', () => {
  it('resolves the canonical default Skin and its compiler inputs', async () => {
    const catalog = await loadSkinCatalog();
    const resolved = resolveCatalog(catalog, ['default-video']);

    expect(catalog.items.find((item) => item.name === 'default-video')).toMatchObject({
      style: {
        scope: 'media-skin-video',
        theme: 'default',
        variant: 'default',
      },
      dependencies: [
        'airplay-button',
        'buffering-indicator',
        'captions-button',
        'cast-button',
        'container',
        'error-dialog',
        'fullscreen-button',
        'overlay',
        'pip-button',
        'play-button',
        'poster',
        'seek-indicator',
        'status-announcer',
        'status-indicator',
        'time-slider',
        'video-gestures',
        'video-hotkeys',
        'video-settings-menu',
        'volume-indicator',
        'volume-popover',
      ],
    });
    expect(resolved.items.map((item) => item.name)).toEqual([
      'button-tooltip',
      'airplay-button',
      'buffering-indicator',
      'captions-button',
      'cast-button',
      'container',
      'error-dialog',
      'fullscreen-button',
      'overlay',
      'pip-button',
      'play-button',
      'poster',
      'seek-indicator',
      'status-announcer',
      'status-indicator',
      'time-slider',
      'video-gestures',
      'video-hotkeys',
      'video-settings-menu',
      'volume-indicator',
      'mute-button',
      'volume-slider',
      'volume-popover',
      'default-video',
    ]);
    expect(resolved.files.style).toEqual([
      './styles/components/buffering.styles.ts',
      './styles/components/button.styles.ts',
      './styles/components/container.styles.ts',
      './styles/components/error-dialog.styles.ts',
      './styles/components/menu.styles.ts',
      './styles/components/overlay.styles.ts',
      './styles/components/popup.styles.ts',
      './styles/components/poster.styles.ts',
      './styles/components/seek-indicator.styles.ts',
      './styles/components/slider.styles.ts',
      './styles/components/status-announcer.styles.ts',
      './styles/components/status-indicator-overlay.styles.ts',
      './styles/components/status-indicator.styles.ts',
      './styles/components/volume-indicator.styles.ts',
      './styles/skins/default-video.styles.ts',
    ]);
    expect(resolved.files.source).toHaveLength(34);
    expect(resolved.files.source).toContain('./skins/default-video/skin.tsx');
  });

  it('loads styles from resolved catalog items', async () => {
    const catalog = await loadSkinCatalog();
    const manifest = await loadCatalogStyles(catalog, ['play-button']);
    const rules = manifest.modules.get(resolve(canonicalRoot, 'styles/components/button.styles.ts'));

    expect(rules?.get('root')).toMatchObject({ className: 'media-button', file: 'buttons.css' });
    expect(rules?.get('icons.pause')?.className).toBe('media-pause-icon');
    expect(rules?.get('play')?.utilities).toContain('group/play');
  });
});
