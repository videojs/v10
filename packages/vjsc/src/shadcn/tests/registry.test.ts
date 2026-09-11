import { describe, expect, it } from 'vite-plus/test';

import type { ComponentMeta } from '../../components';
import type { Graph, GraphModule } from '../../graph';
import { createShadcnRegistryFiles } from '../registry';

interface FixtureMeta extends ComponentMeta {
  readonly type: 'block' | 'component';
  readonly title: string;
  readonly description: string;
}

describe('createShadcnRegistryFiles', () => {
  it('keeps source-identical modules local when their generated styles differ', async () => {
    const graph = fixtureGraph();
    const files = await createShadcnRegistryFiles(graph, {
      name: 'example',
      homepage: 'https://example.com',
      namespace: '@example',
      paths: { install: 'components/example', import: '@/components/example' },
      items: {
        resolve({ module }) {
          if (!module.meta) return null;

          if (module.meta.type === 'component') {
            if (module.params.theme === 'minimal') return null;

            return {
              name: 'button',
              type: 'registry:ui',
              title: 'Button',
              description: 'Button.',
              group: 'ui',
              target: 'ui/button.tsx',
            };
          }

          const name = module.params.theme === 'minimal' ? 'video-minimal' : 'video';

          return {
            name,
            type: 'registry:block',
            title: name,
            description: `${name}.`,
            group: 'skins',
            directives: ['use client'],
            target(candidate, root) {
              return candidate.id === root.id ? `skins/${name}/skin.tsx` : `skins/${name}/ui/button.tsx`;
            },
          };
        },
      },
    });
    const defaultItem = registryItem(files, 'skins/registry.json', 'video');
    const minimalItem = registryItem(files, 'skins/registry.json', 'video-minimal');

    expect(defaultItem.registryDependencies).toEqual(['@example/button']);
    expect(defaultItem.files).toHaveLength(1);
    expect(defaultItem.directives).toBeUndefined();
    expect(sourceFile(files, 'skins/files/video/skins/video/skin.tsx')).toMatch(/^"use client";\n\n/);
    expect(minimalItem.registryDependencies).toBeUndefined();
    expect(minimalItem.files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/skins/video-minimal/skin.tsx',
      'components/example/skins/video-minimal/ui/button.tsx',
    ]);
  });

  it('keeps source-identical modules local when a module they import differs', async () => {
    const graph = chainFixtureGraph();
    const files = await createShadcnRegistryFiles(graph, {
      name: 'example',
      homepage: 'https://example.com',
      namespace: '@example',
      paths: { install: 'components/example', import: '@/components/example' },
      items: {
        resolve({ module }) {
          if (!module.meta) return null;

          if (module.meta.type === 'component') {
            if (module.params.theme === 'minimal') return null;

            return {
              name: module.meta.name,
              type: 'registry:ui',
              title: module.meta.title,
              description: module.meta.description,
              group: 'ui',
              target: `ui/${module.meta.name}.tsx`,
            };
          }

          const name = module.params.theme === 'minimal' ? 'video-minimal' : 'video';

          return {
            name,
            type: 'registry:block',
            title: name,
            description: `${name}.`,
            group: 'skins',
            target(candidate, root) {
              if (candidate.id === root.id) return `skins/${name}/skin.tsx`;

              return `skins/${name}/ui/${candidate.sourcePath.slice('components/'.length)}`;
            },
          };
        },
      },
    });
    const defaultItem = registryItem(files, 'skins/registry.json', 'video');
    const minimalItem = registryItem(files, 'skins/registry.json', 'video-minimal');

    // The rate button's own source is the same for both themes, but it renders a button whose styles are not.
    expect(defaultItem.registryDependencies).toEqual(['@example/rate-button']);
    expect(defaultItem.files).toHaveLength(1);
    expect(minimalItem.registryDependencies).toBeUndefined();
    expect(minimalItem.files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/skins/video-minimal/skin.tsx',
      'components/example/skins/video-minimal/ui/button.tsx',
      'components/example/skins/video-minimal/ui/rate-button.tsx',
    ]);
  });

  it('selects the registry theme item that owns a source theme target', async () => {
    const graph = fixtureGraph();
    const files = await createShadcnRegistryFiles(graph, {
      name: 'example',
      homepage: 'https://example.com',
      namespace: '@example',
      paths: { install: 'components/example', import: '@/components/example' },
      items: {
        resolve({ module }) {
          if (module.meta?.type !== 'block') return null;

          const theme = module.params.theme;

          return {
            name: `video-${theme}`,
            type: 'registry:block',
            title: `Video ${theme}`,
            description: `Video ${theme}.`,
            group: 'skins',
            target(candidate, root) {
              return candidate.id === root.id
                ? `skins/video/${theme}.tsx`
                : `skins/video/${theme}/${candidate.sourcePath}`;
            },
            theme: `styles/${theme}.css`,
          };
        },
      },
      styles: {
        theme: {
          name: '_style-default',
          title: 'Default theme',
          description: 'Default theme.',
          target: 'styles/default.css',
        },
        themes: [
          {
            name: '_style-minimal',
            title: 'Minimal theme',
            description: 'Minimal theme.',
            target: 'styles/minimal.css',
          },
        ],
      },
    });
    const defaultItem = registryItem(files, 'skins/registry.json', 'video-default');
    const minimalItem = registryItem(files, 'skins/registry.json', 'video-minimal');

    expect(defaultItem.registryDependencies).toEqual(['@example/_style-default']);
    expect(minimalItem.registryDependencies).toEqual(['@example/_style-minimal']);
    expect(sourceFile(files, 'skins/files/video-default/skins/video/default.tsx')).toMatch(
      /^import '\.\.\/\.\.\/styles\/default\.css';/
    );
    expect(sourceFile(files, 'skins/files/video-minimal/skins/video/minimal.tsx')).toMatch(
      /^import '\.\.\/\.\.\/styles\/minimal\.css';/
    );
  });

  it('imports multiple registered theme stylesheets in configured order', async () => {
    const graph = fixtureGraph();
    const files = await createShadcnRegistryFiles(graph, {
      name: 'example',
      homepage: 'https://example.com',
      namespace: '@example',
      paths: { install: 'components/example', import: '@/components/example' },
      items: {
        resolve({ module }) {
          if (module.meta?.type !== 'component' || module.params.theme !== 'minimal') return null;

          return {
            name: 'button',
            type: 'registry:ui',
            title: 'Button',
            description: 'Button.',
            group: 'ui',
            target: 'ui/button.tsx',
            theme: ['styles/tokens.css', 'styles/overrides.css'],
          };
        },
      },
      styles: {
        theme: {
          name: '_style-base',
          title: 'Base theme',
          description: 'Base theme.',
          target: 'styles/tokens.css',
        },
        themes: [
          {
            name: '_style-minimal',
            title: 'Minimal theme',
            description: 'Minimal theme.',
            target: 'styles/overrides.css',
          },
        ],
      },
    });
    const item = registryItem(files, 'ui/registry.json', 'button');
    const source = sourceFile(files, 'ui/files/button/button.tsx');

    expect(item.registryDependencies).toEqual(['@example/_style-base', '@example/_style-minimal']);
    expect(source).toMatch(/^import '\.\.\/styles\/tokens\.css';\n\nimport '\.\.\/styles\/overrides\.css';/);
  });

  it('imports one registered theme before a source-owned stylesheet', async () => {
    const graph = fixtureGraph();
    const files = await createShadcnRegistryFiles(graph, {
      name: 'example',
      homepage: 'https://example.com',
      namespace: '@example',
      paths: { install: 'components/example', import: '@/components/example' },
      items: {
        resolve({ module }) {
          if (!module.meta || module.params.theme !== 'default') return null;

          if (module.meta.type === 'component') {
            return {
              name: 'button',
              type: 'registry:ui',
              title: 'Button',
              description: 'Button.',
              group: 'ui',
              target: 'ui/button.tsx',
            };
          }

          return {
            name: 'video',
            type: 'registry:block',
            title: 'Video',
            description: 'Video.',
            group: 'skins',
            target: 'video/skin.tsx',
            stylesheet: { target: 'audio/skin.css' },
            theme: 'styles/theme.css',
          };
        },
      },
      styles: {
        theme: {
          name: '_style-theme',
          title: 'Theme',
          description: 'Theme.',
          target: 'styles/theme.css',
        },
      },
    });
    const source = sourceFile(files, 'skins/files/video/default.tsx');

    expect(source).toMatch(/^import '\.\.\/styles\/theme\.css';\n\nimport '\.\.\/audio\/skin\.css';/);
  });
});

function fixtureGraph(): Graph<FixtureMeta> {
  const root = '/fixture';
  const modules = new Map<string, GraphModule<FixtureMeta>>();
  const assets = new Map<string, string>();

  for (const theme of ['default', 'minimal'] as const) {
    const rootId = `${root}/skins/${theme}.tsx?theme=${theme}`;
    const componentId = `${root}/components/button.tsx?theme=${theme}`;
    const source = `import { Button } from '../components/button';\nexport function Skin() { return <Button />; }`;
    const styleId = `virtual:vjsc/css/${theme}/buttons.css`;

    assets.set(styleId, `.media-button { color: ${theme === 'default' ? 'black' : 'white'}; }`);
    modules.set(rootId, {
      id: rootId,
      filename: `${root}/skins/${theme}.tsx`,
      sourcePath: `skins/${theme}.tsx`,
      params: { theme },
      source,
      imports: [{ ...importReference(source, '../components/button'), resolvedId: componentId }],
      styles: { files: [], assets: [] },
      meta: { name: theme, type: 'block', title: theme, description: `${theme}.` },
    });
    modules.set(componentId, {
      id: componentId,
      filename: `${root}/components/button.tsx`,
      sourcePath: 'components/button.tsx',
      params: { theme },
      source: 'export function Button() { return <button />; }',
      imports: [],
      styles: { files: ['buttons.css'], assets: [styleId] },
      meta: { name: 'button', type: 'component', title: 'Button', description: 'Button.' },
    });
  }

  return { root, modules, assets };
}

/** A skin rendering a rate button whose source never changes, over a button whose styles change per theme. */
function chainFixtureGraph(): Graph<FixtureMeta> {
  const root = '/fixture';
  const modules = new Map<string, GraphModule<FixtureMeta>>();
  const assets = new Map<string, string>();

  for (const theme of ['default', 'minimal'] as const) {
    const rootId = `${root}/skins/${theme}.tsx?theme=${theme}`;
    const rateButtonId = `${root}/components/rate-button.tsx?theme=${theme}`;
    const buttonId = `${root}/components/button.tsx?theme=${theme}`;
    const skinSource = `import { RateButton } from '../components/rate-button';\nexport function Skin() { return <RateButton />; }`;
    const rateButtonSource = `import { Button } from './button';\nexport function RateButton() { return <Button />; }`;
    const styleId = `virtual:vjsc/css/${theme}/buttons.css`;

    assets.set(styleId, `.media-button { border-radius: ${theme === 'default' ? '8px' : '16px'}; }`);
    modules.set(rootId, {
      id: rootId,
      filename: `${root}/skins/${theme}.tsx`,
      sourcePath: `skins/${theme}.tsx`,
      params: { theme },
      source: skinSource,
      imports: [{ ...importReference(skinSource, '../components/rate-button'), resolvedId: rateButtonId }],
      styles: { files: [], assets: [] },
      meta: { name: theme, type: 'block', title: theme, description: `${theme}.` },
    });
    modules.set(rateButtonId, {
      id: rateButtonId,
      filename: `${root}/components/rate-button.tsx`,
      sourcePath: 'components/rate-button.tsx',
      params: { theme },
      source: rateButtonSource,
      imports: [{ ...importReference(rateButtonSource, './button'), resolvedId: buttonId }],
      styles: { files: [], assets: [] },
      meta: { name: 'rate-button', type: 'component', title: 'Rate Button', description: 'Rate button.' },
    });
    modules.set(buttonId, {
      id: buttonId,
      filename: `${root}/components/button.tsx`,
      sourcePath: 'components/button.tsx',
      params: { theme },
      source: 'export function Button() { return <button />; }',
      imports: [],
      styles: { files: ['buttons.css'], assets: [styleId] },
      meta: { name: 'button', type: 'component', title: 'Button', description: 'Button.' },
    });
  }

  return { root, modules, assets };
}

function importReference(source: string, specifier: string) {
  const start = source.indexOf(`'${specifier}'`);

  return { specifier, kind: 'static' as const, start, end: start + specifier.length + 2, quote: "'", bindings: [] };
}

function registryItem(files: Awaited<ReturnType<typeof createShadcnRegistryFiles>>, path: string, name: string): any {
  const file = files.find((candidate) => candidate.path === path);
  if (!file) throw new Error(`Missing registry: ${path}`);

  const registry = JSON.parse(file.content);
  const item = registry.items.find((candidate: { name: string }) => candidate.name === name);
  if (!item) throw new Error(`Missing registry item: ${name}`);

  return item;
}

function sourceFile(files: Awaited<ReturnType<typeof createShadcnRegistryFiles>>, path: string): string {
  const file = files.find((candidate) => candidate.path === path);
  if (!file) throw new Error(`Missing source file: ${path}`);

  return file.content;
}
