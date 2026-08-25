import { resolve } from 'node:path';

import type { Plugin } from 'rolldown';
import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vite-plus/test';

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

  it('combines normalized variants in selection order', async () => {
    const input = `
      import styles from './fixtures/button.styles';
      export const button = <button className={styles.root} />;
    `;
    const base = await transform(input, undefined, stylePlugin({ mode: 'tailwind' }));
    const selected = await transform(
      input,
      undefined,
      stylePlugin({ mode: 'tailwind', variants: ['compact', 'disabled'] })
    );

    expect(base.source).toContain('p-3');
    expect(base.source).not.toContain('pointer-events-none');
    expect(selected.source).toContain('p-1');
    expect(selected.source).not.toContain('p-3');
    expect(selected.source).toContain('pointer-events-none');
  });

  it('forwards multiple variants to generated CSS', async () => {
    const styles = stylePlugin({
      mode: 'css',
      variants: ['compact', 'disabled'],
      stylesheet: { input: designPath },
    });
    const { source } = await transform(
      `
        import styles from './fixtures/button.styles';
        export const button = <button className={styles.root} />;
      `,
      undefined,
      styles
    );
    const id = virtualCssIds(source)[0];
    if (!id) throw new Error('Expected a generated semantic stylesheet.');

    expect(await loadPlugin(styles, id)).toContain('pointer-events: none');
  });

  it('rejects style references outside className', async () => {
    const source = `import styles from './fixtures/button.styles'; export const value = styles.button;`;

    await expect(transform(source)).rejects.toMatchObject({
      errors: [
        {
          message: expect.stringContaining('must use static className references'),
          pos: source.indexOf('styles.button'),
        },
      ],
    });
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

  it('imports runtime base CSS before generated semantic styles', async () => {
    const { source } = await transform(
      `
        import styles from './fixtures/button.styles';
        export const button = <button className={styles.button} />;
      `,
      {
        manifest,
        mode: 'css',
        stylesheet: { input: designPath, base: designDependency },
      }
    );

    const base = source.indexOf('/base.css');
    const semantic = source.indexOf('/buttons.css');

    expect(base).toBeGreaterThanOrEqual(0);
    expect(semantic).toBeGreaterThan(base);
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

  it('warns once when authored and compiled checks find the same complex selector', async () => {
    const complexManifest = createManifest([rule(['root'], 'media-root', ['[&_img]:block', '[&_video]:block'])]);
    const styles = stylePlugin({
      manifest: complexManifest,
      mode: 'css',
      stylesheet: { input: designPath },
    });
    const { warnings } = await transform(
      `import styles from './fixtures/button.styles'; export const root = <div className={styles.root} />;`,
      undefined,
      styles
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('[VJSC_STYLE_COMPLEX_SELECTOR]');
    expect(warnings[0]).toContain('`[&_img]:block`, `[&_video]:block`');
    expect(warnings[0]).toContain('Reason:');
    expect(warnings[0]).toContain('Recommendation:');
  });

  it('promotes or silences complex-selector warnings', async () => {
    const complexManifest = createManifest([rule(['root'], 'media-root', ['[&_img]:block'])]);
    const input = `import styles from './fixtures/button.styles'; export const root = <div className={styles.root} />;`;

    await expect(
      transform(
        input,
        undefined,
        stylePlugin({ manifest: complexManifest, mode: 'tailwind' }, { complexSelectors: 'error' })
      )
    ).rejects.toThrow('[VJSC_STYLE_COMPLEX_SELECTOR]');

    const { warnings } = await transform(
      input,
      undefined,
      stylePlugin({ manifest: complexManifest, mode: 'tailwind' }, { complexSelectors: 'off' })
    );

    expect(warnings).toEqual([]);
  });

  it('keeps isolation errors active when complex-selector warnings are off', async () => {
    const peerManifest = createManifest([rule(['root'], 'media-root', ['peer/dialog'])]);
    const input = `import styles from './fixtures/button.styles'; export const root = <div className={styles.root} />;`;

    await expect(
      transform(
        input,
        undefined,
        stylePlugin({ manifest: peerManifest, mode: 'tailwind' }, { complexSelectors: 'off' })
      )
    ).rejects.toThrow('[VJSC_STYLE_PEER_RELATIONSHIP]');
  });
});

async function transform(
  source: string,
  config: StylePluginConfig = { manifest, mode: 'tailwind' },
  styles: Plugin = stylePlugin(config)
): Promise<{ readonly source: string; readonly warnings: readonly string[] }> {
  let meta: unknown;
  const warnings: string[] = [];
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
    onLog(level, log) {
      if (level === 'warn') warnings.push(log.message);
    },
  });

  await bundle.generate({ format: 'es' });

  const output = readComponentSource(meta);
  if (output === undefined) throw new Error('Fixture build did not retain editable source.');

  return { source: output, warnings };
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

async function loadPlugin(plugin: Plugin, id: string): Promise<string> {
  const resolved = await resolvePluginId(plugin, id);
  if (typeof resolved !== 'string') throw new Error(`Could not resolve ${id}.`);

  const hook = plugin.load;
  if (!hook) throw new Error('Expected the style plugin to provide a load hook.');

  const handler = typeof hook === 'function' ? hook : hook.handler;
  const result = await (handler as (id: string) => unknown)(resolved);
  if (typeof result !== 'string') throw new Error(`Could not load ${id}.`);

  return result;
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

function createManifest(items: readonly StyleManifestRule[]): StyleManifest {
  return {
    modules: new Map([[modulePath, new Map(items.map((item) => [item.tokenPath.join('.'), item]))]]),
    rules: items,
    watchFiles: [],
  };
}
