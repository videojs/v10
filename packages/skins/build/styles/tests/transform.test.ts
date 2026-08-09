import { resolve } from 'node:path';
import { compile, jsx } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import type { SkinStyleManifest, SkinStyleRecipe } from '../manifest';
import { createSkinStyleUsage, skinStyles } from '../transform';

const filename = resolve(import.meta.dirname, 'component.tsx');
const modulePath = resolve(import.meta.dirname, 'fixture.tailwind.ts');
const recipes = [
  recipe(['button'], 'media-button', ['grid', 'p-0']),
  recipe(['seekButton'], 'media-seek-button', []),
  recipe(['buttonIcon'], 'media-button-icon', ['size-4']),
  recipe(['seekButtonIcon', 'backward'], 'media-seek-button-icon-backward', ['-scale-x-100']),
  recipe(['seekButtonIcon', 'forward'], 'media-seek-button-icon-forward', []),
];
const manifest: SkinStyleManifest = {
  modules: new Map([[modulePath, new Map(recipes.map((recipe) => [recipe.tokenPath.join('.'), recipe]))]]),
  recipes,
  groupPeerBindings: new Map(),
};
const source = `
  import styles from './fixture.tailwind';
  const seekIcon = styles.seekButtonIcon;
  export function Example({ reverse }) {
    return <button className={[styles.button, styles.seekButton, 'hook']}>
      <span className={reverse
        ? [styles.buttonIcon, seekIcon.backward]
        : [styles.buttonIcon, seekIcon.forward]} />
    </button>;
  }
`;

describe('skinStyles', () => {
  it('projects default-exported style references to Tailwind utilities', async () => {
    const result = await compileWithStyle('tailwind');

    expect(result.code).toContain('className="grid p-0 hook"');
    expect(result.code).toContain('? "size-4 -scale-x-100" : "size-4"');
    expect(result.code).not.toContain('fixture.tailwind');
    expect(result.code).not.toContain('seekIcon');
  });

  it('projects the same references to semantic classes and records compositions', async () => {
    const usage = createSkinStyleUsage();
    const result = await compileWithStyle('vanilla', usage);

    expect(result.code).toContain('className="media-button media-seek-button hook"');
    expect(result.code).toContain(
      '? "media-button-icon media-seek-button-icon-backward" : "media-button-icon media-seek-button-icon-forward"'
    );
    expect(result.code).not.toContain('seekIcon');
    expect(usage.compositions.map((composition) => composition.classNames)).toContainEqual([
      'media-button',
      'media-seek-button',
    ]);
  });

  it('rejects style references outside the supported static className forms', async () => {
    await expect(
      compile(
        `import styles from './fixture.tailwind'; export const Example = ({ enabled }) => <div className={enabled && styles.button} />;`,
        {
          filename,
          config: { target: jsx(), plugins: [skinStyles({ manifest, target: 'vanilla' })] },
        }
      )
    ).rejects.toThrow('must use static className references');
  });
});

function compileWithStyle(target: 'tailwind' | 'vanilla', usage = createSkinStyleUsage()) {
  return compile(source, {
    filename,
    config: {
      target: jsx(),
      plugins: [skinStyles({ manifest, target, usage })],
    },
  });
}

function recipe(tokenPath: readonly string[], className: string, utilities: readonly string[]): SkinStyleRecipe {
  return { modulePath, tokenPath, className, role: 'buttons', utilities };
}
