import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { jsx } from '../../config';
import { transform } from '../../transform';
import type { StyleManifest, StyleManifestRule } from '../manifest';
import { plugin } from '../plugin';

const filename = resolve(import.meta.dirname, 'component.tsx');

const modulePath = resolve(import.meta.dirname, 'fixture.styles.ts');

const rules = [
  rule(['button'], 'media-button', ['grid', 'p-0']),
  rule(['seekButton'], 'media-seek-button', []),
  rule(['buttonIcon'], 'media-button-icon', ['size-4']),
  rule(['seekBackwardIcon'], 'media-seek-backward-icon', ['-scale-x-100']),
];

const manifest: StyleManifest = {
  modules: new Map([[modulePath, new Map(rules.map((rule) => [rule.tokenPath.join('.'), rule]))]]),
  rules,
  watchFiles: [],
};

const source = `
  import styles from './fixture.styles';
  export function Example({ reverse }) {
    return <button className={[styles.button, styles.seekButton, 'hook']}>
      <span className={[styles.buttonIcon, reverse && styles.seekBackwardIcon]} />
    </button>;
  }
`;

describe('plugin static references', () => {
  it('projects default-exported style references to Tailwind utilities', async () => {
    const result = await compileWithStyle('tailwind');

    expect(result.code).toContain(`className={["grid", "p-0", 'hook']}`);
    expect(result.code).toContain('className={["size-4", reverse && "-scale-x-100"]}');
    expect(result.code).not.toContain('fixture.styles');
  });

  it('projects the same references to semantic classes', async () => {
    const result = await compileWithStyle('css');

    expect(result.code).toContain(`className="media-button media-seek-button hook"`);
    expect(result.code).toContain('className={["media-button-icon", reverse && "media-seek-backward-icon"]}');
  });

  it('rejects aliases for style references', async () => {
    await expect(
      transform(
        `import styles from './fixture.styles'; const button = styles.button; export const Example = () => <div className={button} />;`,
        {
          filename,
          config: { target: jsx(), plugins: [plugin({ manifest, mode: 'css' })] },
        }
      )
    ).rejects.toThrow('must use static className references');
  });

  it('rejects style references outside the supported static className forms', async () => {
    await expect(
      transform(
        `import styles from './fixture.styles'; export const Example = ({ enabled }) => <div className={enabled && styles.button} />;`,
        {
          filename,
          config: { target: jsx(), plugins: [plugin({ manifest, mode: 'css' })] },
        }
      )
    ).rejects.toThrow('must use static className references');
  });

  it('ignores matching property names outside style references', async () => {
    const result = await transform(
      `import styles from './fixture.styles'; const value = { styles: true }; export const Example = () => <div className={styles.button}>{value.styles}</div>;`,
      {
        filename,
        config: { target: jsx(), plugins: [plugin({ manifest, mode: 'css' })] },
      }
    );

    expect(result.code).toContain('className="media-button"');
    expect(result.code).toContain('value.styles');
  });
});

function compileWithStyle(mode: 'tailwind' | 'css') {
  return transform(source, {
    filename,
    config: {
      target: jsx(),
      plugins: [plugin({ manifest, mode })],
    },
  });
}

function rule(tokenPath: readonly string[], className: string, utilities: readonly string[]): StyleManifestRule {
  return {
    modulePath,
    tokenPath,
    className,
    file: 'buttons.css',
    layer: 'videojs.components',
    scopeRoot: false,
    utilityGroups: utilities,
    utilities,
    variantGroups: {},
    variants: {},
  };
}
