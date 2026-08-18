import { resolve } from 'node:path';
import { jsx, transform } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import type { SkinStyleManifest, SkinStyleRecipe } from '../manifest';
import { skinStyles } from '../transform';

const filename = resolve(import.meta.dirname, 'component.tsx');
const modulePath = resolve(import.meta.dirname, 'fixture.tailwind.ts');
const recipes = [
  recipe(['button'], 'media-button', ['grid', 'p-0']),
  recipe(['seekButton'], 'media-seek-button', []),
  recipe(['buttonIcon'], 'media-button-icon', ['size-4']),
  recipe(['seekBackwardIcon'], 'media-seek-backward-icon', ['-scale-x-100']),
];
const manifest: SkinStyleManifest = {
  modules: new Map([[modulePath, new Map(recipes.map((recipe) => [recipe.tokenPath.join('.'), recipe]))]]),
  recipes,
  groupOwners: new Map(),
  peerMarkers: new Set(),
};
const source = `
  import styles from './fixture.tailwind';
  export function Example({ reverse }) {
    return <button className={[styles.button, styles.seekButton, 'hook']}>
      <span className={reverse
        ? [styles.buttonIcon, styles.seekBackwardIcon]
        : styles.buttonIcon} />
    </button>;
  }
`;

describe('skinStyles', () => {
  it('projects default-exported style references to Tailwind utilities', async () => {
    const result = await compileWithStyle('tailwind');

    expect(result.code).toContain('className="grid p-0 hook"');
    expect(result.code).toContain('? "size-4 -scale-x-100" : "size-4"');
    expect(result.code).not.toContain('fixture.tailwind');
  });

  it('projects the same references to semantic classes', async () => {
    const result = await compileWithStyle('vanilla');

    expect(result.code).toContain('className="media-button media-seek-button hook"');
    expect(result.code).toContain('? "media-button-icon media-seek-backward-icon" : "media-button-icon"');
  });

  it('rejects aliases for style references', async () => {
    await expect(
      transform(
        `import styles from './fixture.tailwind'; const button = styles.button; export const Example = () => <div className={button} />;`,
        {
          filename,
          config: { target: jsx(), plugins: [skinStyles({ manifest, target: 'vanilla' })] },
        }
      )
    ).rejects.toThrow('must use static className references');
  });

  it('rejects style references outside the supported static className forms', async () => {
    await expect(
      transform(
        `import styles from './fixture.tailwind'; export const Example = ({ enabled }) => <div className={enabled && styles.button} />;`,
        {
          filename,
          config: { target: jsx(), plugins: [skinStyles({ manifest, target: 'vanilla' })] },
        }
      )
    ).rejects.toThrow('must use static className references');
  });

  it('ignores matching property names outside style references', async () => {
    const result = await transform(
      `import styles from './fixture.tailwind'; const value = { styles: true }; export const Example = () => <div className={styles.button}>{value.styles}</div>;`,
      {
        filename,
        config: { target: jsx(), plugins: [skinStyles({ manifest, target: 'vanilla' })] },
      }
    );

    expect(result.code).toContain('className="media-button"');
    expect(result.code).toContain('value.styles');
  });
});

function compileWithStyle(target: 'tailwind' | 'vanilla') {
  return transform(source, {
    filename,
    config: {
      target: jsx(),
      plugins: [skinStyles({ manifest, target })],
    },
  });
}

function recipe(tokenPath: readonly string[], className: string, utilities: readonly string[]): SkinStyleRecipe {
  return { modulePath, tokenPath, className, role: 'buttons', utilities };
}
