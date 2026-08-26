import { resolve } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { compileStyles } from '../compile';
import { loadDesignSystem } from '../design-system';
import type { StyleManifest, StyleManifestRule } from '../manifest';

const designPath = resolve(import.meta.dirname, 'fixtures/tailwind.css');

describe('compileStyles', () => {
  it('includes explicitly configured semantic classes on the CSS scope root', async () => {
    const container = { ...rule('root', 'media-container', ['block']), scopeRoot: true };
    const styles = await compileStyles({
      design: await loadDesignSystem(designPath),
      manifest: manifest([container]),
      scope: '.media-skin-video',
    });

    expect(styles.get('buttons.css')).toContain(':scope.media-container');
    expect(styles.get('buttons.css')).toContain('.media-container');
  });

  it('rewrites named group variants to their semantic owner', async () => {
    const playButton = rule('playButton', 'media-play-button', ['group/play']);
    const restartIcon = rule('restartIcon', 'media-restart-icon', ['hidden', 'group-data-ended/play:block']);
    const styles = await compileStyles({
      design: await loadDesignSystem(designPath),
      manifest: manifest([playButton, restartIcon]),
      scope: '.media-skin-video',
    });

    expect(styles.get('buttons.css')).toContain('@scope (.media-skin-video)');
    expect(styles.get('buttons.css')).toContain('@scope (.media-play-button)');
    expect(styles.get('buttons.css')).toContain('&[data-ended]');
    expect(styles.get('buttons.css')).toContain('.media-restart-icon');
    expect(styles.get('buttons.css')).not.toContain('group\\/play');
    expect(styles.get('buttons.css')).not.toContain(':where(');
  });

  it('folds stacked group conditions and negative calculations into reviewable CSS', async () => {
    const muteButton = rule('muteButton', 'media-mute-button', ['grid', 'group/mute']);
    const highIcon = rule('volumeHighIcon', 'media-volume-high-icon', [
      'hidden',
      '-outline-offset-2',
      'group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:block',
    ]);
    const styles = await compileStyles({
      design: await loadDesignSystem(designPath),
      manifest: manifest([muteButton, highIcon]),
      scope: '.media-skin-video',
    });

    expect(styles.get('buttons.css')).toContain(
      '&:not([data-muted]):not([data-volume-level="low"]) .media-volume-high-icon'
    );
    expect(styles.get('buttons.css')).toContain('outline-offset: -2px');
    expect(styles.get('buttons.css')).not.toContain(':is(:where(.media-mute-button)');
    expect(styles.get('buttons.css')).not.toContain(':where(');
    expect(styles.get('buttons.css')).not.toContain('calc(2px * -1)');
  });

  it('keeps responsive overrides after each semantic rule base', async () => {
    const primary = rule('primary', 'media-controls-primary', ['flex', '@lg/media-root:contents']);
    const root = rule('root', 'media-layout-root', ['contents', '@lg/media-root:flex']);
    const styles = await compileStyles({
      design: await loadDesignSystem(designPath),
      manifest: manifest([primary, root]),
      scope: '.media-skin-video',
    });

    const css = styles.get('buttons.css') ?? '';
    const rootBase = css.indexOf('.media-layout-root {\n      display: contents;');
    const rootResponsive = css.indexOf('.media-layout-root {\n        display: flex;');

    expect(rootBase).toBeGreaterThanOrEqual(0);
    expect(rootResponsive).toBeGreaterThan(rootBase);
  });
  it('combines selected variants in order across rules', async () => {
    const button = rule('root', 'media-button', ['grid', 'p-3'], {
      compact: ['p-1'],
      spacious: ['p-4'],
    });
    const icon = rule('icon', 'media-icon', ['size-4'], { interactive: ['pointer-events-none'] });
    const styles = await compileStyles({
      design: await loadDesignSystem(designPath),
      manifest: manifest([button, icon]),
      variants: ['compact', 'interactive', 'spacious'],
    });

    expect(styles.get('buttons.css')).toContain('padding: 1rem');
    expect(styles.get('buttons.css')).not.toContain('padding: .25rem');
    expect(styles.get('buttons.css')).toContain('pointer-events: none');
  });

  it('ignores selected variants absent from an isolated manifest', async () => {
    const styles = await compileStyles({
      design: await loadDesignSystem(designPath),
      manifest: manifest([rule('root', 'media-button', ['grid'])]),
      variants: ['shadow-dom'],
    });

    expect(styles.get('buttons.css')).toContain('display: grid');
  });
});

function rule(
  token: string,
  className: string,
  utilities: readonly string[],
  variantGroups: Readonly<Record<string, readonly string[]>> = {}
): StyleManifestRule {
  return {
    modulePath: 'test.styles.ts',
    tokenPath: token.split('.'),
    className,
    file: 'buttons.css',
    layer: 'videojs.components',
    scopeRoot: false,
    utilityGroups: utilities,
    utilities,
    variantGroups,
    variants: variantGroups,
  };
}

function manifest(rules: readonly StyleManifestRule[]): StyleManifest {
  return { modules: new Map(), rules, watchFiles: [] };
}
