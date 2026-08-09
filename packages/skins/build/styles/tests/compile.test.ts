import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileSkinStyles, loadDesignSystem } from '../compile';
import type { SkinStyleManifest, SkinStyleRecipe } from '../manifest';

const designPath = resolve(import.meta.dirname, '../../../canonical/styles/tailwind.css');

describe('compileSkinStyles', () => {
  it('rewrites named group variants to their semantic owner', async () => {
    const playButton = recipe('playButton', 'media-play-button', ['group/play']);
    const restartIcon = recipe('playButtonIcon.restart', 'media-play-button-icon-restart', [
      'hidden',
      'group-data-ended/play:block',
    ]);
    const styles = await compileSkinStyles({
      design: await loadDesignSystem(designPath),
      manifest: manifest([playButton, restartIcon], new Map([['group/play', playButton.className]])),
    });

    expect(styles.get('buttons')).toContain(':where(.media-play-button)[data-ended]');
    expect(styles.get('buttons')).toContain('.media-play-button-icon-restart');
    expect(styles.get('buttons')).not.toContain('group\\/play');
  });

  it('folds stacked group conditions and negative calculations into reviewable CSS', async () => {
    const muteButton = recipe('muteButton', 'media-mute-button', ['grid', 'group/mute']);
    const highIcon = recipe('muteButtonIcon.high', 'media-mute-button-icon-high', [
      'hidden',
      '-outline-offset-2',
      'group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:block',
    ]);
    const styles = await compileSkinStyles({
      design: await loadDesignSystem(designPath),
      manifest: manifest([muteButton, highIcon], new Map([['group/mute', muteButton.className]])),
    });

    expect(styles.get('buttons')).toContain(
      ':where(.media-mute-button):not([data-muted]):not([data-volume-level="low"]) .media-mute-button-icon-high'
    );
    expect(styles.get('buttons')).toContain('outline-offset: -2px');
    expect(styles.get('buttons')).not.toContain(':is(:where(.media-mute-button)');
    expect(styles.get('buttons')).not.toContain('calc(2px * -1)');
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
  groupPeerBindings: ReadonlyMap<string, string> = new Map()
): SkinStyleManifest {
  return { modules: new Map(), recipes, groupPeerBindings };
}
