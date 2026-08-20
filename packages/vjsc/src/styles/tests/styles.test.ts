import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { jsx } from '../../config';
import { transform } from '../../transform';
import { getStyleDefinition } from '../define';
import { collectReferencedStyleRules, loadStyleManifest, plugin, styles } from '../index';

const fixtureRoot = resolve(import.meta.dirname, 'fixtures');

const componentFile = resolve(fixtureRoot, 'component.tsx');

const conditionalComponentFile = resolve(fixtureRoot, 'conditional-component.tsx');

const styleFile = resolve(fixtureRoot, 'button.styles.ts');

const tailwindInput = resolve(fixtureRoot, 'tailwind.css');

const component = `
  import { cn } from '@videojs/utils/style';
  import styles from './button.styles';
  export function Button() {
    return <button className={cn(styles.root, 'hook')}><span className={styles.icon} /></button>;
  }
`;

describe('styles', () => {
  it('returns typed semantic references with non-enumerable definition data', () => {
    const references = styles({
      file: 'button.css',
      layer: 'fixture.components',
      rules: {
        root: { className: 'fixture-button', utilities: 'grid' },
        icon: { className: 'fixture-icon', utilities: 'size-4' },
      },
    });

    expect(references).toEqual({ root: 'fixture-button', icon: 'fixture-icon' });
    expect(Object.keys(references)).toEqual(['root', 'icon']);
    expect(getStyleDefinition(references)).toMatchObject({
      file: 'button.css',
      layer: 'fixture.components',
    });
  });
});

describe('plugin', () => {
  it('preserves editable Tailwind groups with an explicit class composer', async () => {
    const result = await transform(
      `import styles from './button.styles'; export const Button = () => <button className={styles.root} />;`,
      {
        filename: componentFile,
        config: { target: jsx(), plugins: [plugin({ mode: 'tailwind', variant: 'compact' })] },
      }
    );

    expect(result.code).toContain('import { cn } from "@videojs/utils/style"');
    expect(result.code).toContain('className={cn("grid border-0", "p-1")}');
  });

  it('discovers style imports and projects the configured Tailwind variant', async () => {
    const result = await transform(component, {
      filename: componentFile,
      config: { target: jsx(), plugins: [plugin({ mode: 'tailwind', variant: 'compact' })] },
    });

    expect(result.code).toContain('className={cn("grid border-0", "p-1", \'hook\')}');
    expect(result.code).not.toContain('p-3');
    expect(result.code).toContain('className="size-4"');
    expect(result.code).not.toContain('button.styles');
    expect(result.watchFiles).toContain(resolve(fixtureRoot, 'button.styles.ts'));
    expect(result.assets).toEqual([]);
  });

  it('rejects an unknown configured variant', async () => {
    await expect(
      transform(component, {
        filename: componentFile,
        config: { target: jsx(), plugins: [plugin({ mode: 'tailwind', variant: 'unknown' })] },
      })
    ).rejects.toThrow('does not define the `unknown` variant');
  });

  it('projects semantic classes and emits file- and layer-configured CSS', async () => {
    const result = await transform(component, {
      filename: componentFile,
      config: {
        target: jsx(),
        plugins: [
          plugin({
            mode: 'css',
            variant: 'compact',
            emit: { input: tailwindInput, scope: '.fixture-skin' },
          }),
        ],
      },
    });

    expect(result.code).toContain('className="fixture-button hook"');
    expect(result.code).toContain('className="fixture-button-icon"');
    expect(result.code).not.toContain('import { cn }');
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]).toMatchObject({ type: 'css', fileName: 'components/button.css' });
    expect(result.assets[0]?.source).toContain('@layer fixture.components');
    expect(result.assets[0]?.source).toContain('@scope (.fixture-skin)');
    expect(result.assets[0]?.source).toContain('.fixture-button {');
    expect(result.assets[0]?.source).toContain('padding: .25rem');
  });
});

describe('collectReferencedStyleRules', () => {
  it('finds style references nested in className arrays and conditions', async () => {
    const manifest = await loadStyleManifest([styleFile]);
    const referenced = await collectReferencedStyleRules([conditionalComponentFile], manifest);

    expect(referenced).toEqual(new Set(['fixture-button', 'fixture-button-icon']));
  });
});
