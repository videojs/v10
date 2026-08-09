import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileSkinStyles, loadDesignSystem } from '../compile';
import type { SkinStyleManifest, SkinStyleRecipe } from '../manifest';
import type { SkinStyleUsage } from '../transform';

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
      usage: usage([[playButton.className, restartIcon.className]]),
    });

    expect(styles.get('buttons')).toContain(':where(.media-play-button)[data-ended]');
    expect(styles.get('buttons')).toContain('.media-play-button-icon-restart');
    expect(styles.get('buttons')).not.toContain('group\\/play');
  });

  it('rejects conflicting declarations on co-applied semantic classes', async () => {
    const base = recipe('base', 'media-base', ['p-1']);
    const specific = recipe('specific', 'media-specific', ['p-2']);

    await expect(
      compileSkinStyles({
        design: await loadDesignSystem(designPath),
        manifest: manifest([base, specific]),
        usage: usage([[base.className, specific.className]]),
      })
    ).rejects.toThrow("co-applied semantic classes 'media-base' and 'media-specific' both declare 'padding'");
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

function usage(compositions: readonly (readonly string[])[]): SkinStyleUsage {
  return {
    compositions: compositions.map((classNames) => ({ classNames, origin: { description: 'test' } })),
  };
}
