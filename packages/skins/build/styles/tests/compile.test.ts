import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileSkinStyles, loadDesignSystem } from '../compile';
import type { SkinStyleManifest, SkinStyleRecipe } from '../manifest';

const designPath = resolve(import.meta.dirname, '../../../canonical/styles/tailwind.css');

describe('compileSkinStyles', () => {
  it('rewrites named group variants to their semantic owner', async () => {
    const playButton = recipe('playButton', 'media-play-button', ['group/play']);
    const restartIcon = recipe('restartIcon', 'media-restart-icon', ['hidden', 'group-data-ended/play:block']);
    const styles = await compileSkinStyles({
      design: await loadDesignSystem(designPath),
      manifest: manifest([playButton, restartIcon], new Map([['group/play', playButton.className]])),
      scopeClass: 'media-skin-video',
    });

    expect(styles.get('buttons')).toContain('@scope (.media-skin-video)');
    expect(styles.get('buttons')).toContain('@scope (.media-play-button)');
    expect(styles.get('buttons')).toContain('&[data-ended]');
    expect(styles.get('buttons')).toContain('.media-restart-icon');
    expect(styles.get('buttons')).not.toContain('group\\/play');
    expect(styles.get('buttons')).not.toContain(':where(');
  });

  it('folds stacked group conditions and negative calculations into reviewable CSS', async () => {
    const muteButton = recipe('muteButton', 'media-mute-button', ['grid', 'group/mute']);
    const highIcon = recipe('volumeHighIcon', 'media-volume-high-icon', [
      'hidden',
      '-outline-offset-2',
      'group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:block',
    ]);
    const styles = await compileSkinStyles({
      design: await loadDesignSystem(designPath),
      manifest: manifest([muteButton, highIcon], new Map([['group/mute', muteButton.className]])),
      scopeClass: 'media-skin-video',
    });

    expect(styles.get('buttons')).toContain(
      '&:not([data-muted]):not([data-volume-level="low"]) .media-volume-high-icon'
    );
    expect(styles.get('buttons')).toContain('outline-offset: -2px');
    expect(styles.get('buttons')).not.toContain(':is(:where(.media-mute-button)');
    expect(styles.get('buttons')).not.toContain(':where(');
    expect(styles.get('buttons')).not.toContain('calc(2px * -1)');
  });

  it('rejects peer relationships in vanilla output', async () => {
    const peer = recipe('control', 'media-control', ['peer/control']);

    await expect(
      compileSkinStyles({
        design: await loadDesignSystem(designPath),
        manifest: manifest([peer], new Map(), new Set(['peer/control'])),
        scopeClass: 'media-skin-video',
      })
    ).rejects.toThrow('Vanilla Skin styles do not support peer relationships: peer/control');
  });
});

function recipe(token: string, className: string, utilities: readonly string[]): SkinStyleRecipe {
  return {
    modulePath: 'test.tailwind.ts',
    tokenPath: token.split('.'),
    className,
    role: 'buttons',
    utilities,
  };
}

function manifest(
  recipes: readonly SkinStyleRecipe[],
  groupOwners: ReadonlyMap<string, string> = new Map(),
  peerMarkers: ReadonlySet<string> = new Set()
): SkinStyleManifest {
  return { modules: new Map(), recipes, groupOwners, peerMarkers };
}
