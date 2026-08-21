import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';
import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vitest';

import { compileStyles } from '../../styles/compile';
import { loadDesignSystem } from '../../styles/design-system';
import type { StyleManifest, StyleManifestRule } from '../../styles/manifest';
import { readComponentSource } from '../component-meta';
import { componentSourcePlugin } from '../component-source';
import { type StylePluginConfig, stylePlugin } from '../style';

const filename = resolve(import.meta.dirname, 'component.tsx');
const modulePath = resolve(import.meta.dirname, 'fixtures/button.styles.ts');
const moduleId = `${filename}?target=react`;
const designPath = resolve(import.meta.dirname, 'fixtures/design.css');
const designDependency = resolve(import.meta.dirname, 'fixtures/theme.css');

const rules = [rule(['button'], 'media-button', ['grid', 'p-0']), rule(['icon'], 'media-icon', ['size-4', 'shrink-0'])];

const manifest: StyleManifest = {
  modules: new Map([[modulePath, new Map(rules.map((item) => [item.tokenPath.join('.'), item]))]]),
  rules,
  watchFiles: [],
};

describe('stylePlugin', () => {
  it('rewrites style references with the Oxc AST and preserves expression source', async () => {
    const { source } = await transform(`
      import styles from './fixtures/button.styles';
      export function Example({ active }) {
        return <button className={[styles.button, active && styles.icon, 'hook']} />;
      }
    `);

    expect(source).not.toContain('button.styles');
    expect(source).toContain('className={["grid", "p-0", active && "size-4 shrink-0", \'hook\']}');
  });

  it('rejects style references outside className', async () => {
    await expect(
      transform(`import styles from './fixtures/button.styles'; export const value = styles.button;`)
    ).rejects.toThrow('must use static className references');
  });

  it('tracks imported design-system files and preserves directives', async () => {
    const design = await loadDesignSystem(designPath);
    await compileStyles({ design, manifest });
    const { source } = await transform(
      `
        'use client';
        import styles from './fixtures/button.styles';
        export const button = <button className={styles.button} />;
      `,
      { manifest, mode: 'css', stylesheet: { input: designPath } }
    );

    expect(design.watchFiles).toContain(designDependency);
    expect(source.indexOf(`'use client'`)).toBeLessThan(source.indexOf('virtual:vjsc/css'));
  });

  it('releases stale hashed CSS modules when an owner is recompiled', async () => {
    let scope = '.first';
    const styles = stylePlugin(() => ({
      manifest,
      mode: 'css',
      stylesheet: { input: designPath, scope },
    }));
    const input = `
      import styles from './fixtures/button.styles';
      export const button = <button className={styles.button} />;
    `;

    const first = await transform(input, undefined, styles);
    scope = '.second';
    const second = await transform(input, undefined, styles);
    const firstId = virtualCssIds(first.source)[0];
    const secondId = virtualCssIds(second.source)[0];

    expect(firstId).toBeDefined();
    expect(secondId).toBeDefined();
    expect(secondId).not.toBe(firstId);
    expect(await resolvePluginId(styles, firstId!)).toBeNull();
    expect(await resolvePluginId(styles, secondId!)).toBe(`\0${secondId}`);
  });
});

async function transform(
  source: string,
  config: StylePluginConfig = { manifest, mode: 'tailwind' },
  styles: Plugin = stylePlugin(config)
): Promise<{ readonly source: string }> {
  let meta: unknown;
  const inspect: Plugin = {
    name: 'fixture:inspect',
    buildEnd() {
      meta = this.getModuleInfo(moduleId)?.meta;
    },
  };
  const bundle = await rolldown({
    input: 'fixture',
    experimental: { nativeMagicString: true },
    external: /^virtual:vjsc\/css\//,
    transform: { jsx: 'preserve' },
    plugins: [fixturePlugin(source), styles, componentSourcePlugin(), inspect],
  });

  await bundle.generate({ format: 'es' });

  const output = readComponentSource(meta);
  if (output === undefined) throw new Error('Fixture build did not retain editable source.');
  return { source: output };
}

function virtualCssIds(source: string): string[] {
  return [...source.matchAll(/["'](virtual:vjsc\/css\/[^"']+)["']/g)].map((match) => match[1]!);
}

async function resolvePluginId(plugin: Plugin, id: string): Promise<unknown> {
  const hook = plugin.resolveId;
  if (!hook) return null;

  const handler = typeof hook === 'function' ? hook : hook.handler;
  return (handler as (id: string) => unknown)(id);
}

function fixturePlugin(source: string): Plugin {
  return {
    name: 'fixture:module',
    resolveId(id) {
      return id === 'fixture' ? moduleId : null;
    },
    load(id) {
      return id === moduleId ? { code: source, moduleType: 'tsx' } : null;
    },
  };
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
