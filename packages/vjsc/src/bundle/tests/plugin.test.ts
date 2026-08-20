import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type Plugin, type RolldownOutput, rolldown } from 'rolldown';
import { build as viteBuild } from 'vite';
import { describe, expect, it } from 'vitest';

import { componentMetaPlugin } from '../../components';
import { jsx } from '../../config';
import { schemaPlugin, vjscPlugin } from '../../rolldown';
import { vjscPlugin as viteVjscPlugin } from '../../vite';

describe('vjscPlugin', () => {
  it('uses native host filters for included and excluded modules', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-filter-'));
    const source = join(root, 'view.tsx');
    const excluded = join(root, 'view.test.tsx');
    writeFileSync(source, 'export const view = <div/>;');
    writeFileSync(excluded, 'export const testView = <div/>;');
    const transformed: string[] = [];

    const bundle = await rolldown({
      input: [source, excluded],
      external: /^react\//,
      plugins: [
        vjscPlugin({
          include: '**/*.tsx',
          exclude: '**/*.test.tsx',
          transform: {
            plugins: [
              {
                name: 'record-transform',
                setup(context) {
                  transformed.push(context.filename);
                  return {};
                },
              },
            ],
          },
        }),
      ],
    });
    await bundle.generate({ format: 'es' });

    expect(transformed).toHaveLength(1);
    expect(transformed[0]).toMatch(/\/view\.tsx$/);
  });

  it('projects real source modules and propagates the projection through relative imports', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-projection-'));
    const entry = join(root, 'entry.tsx');
    const child = join(root, 'child.tsx');
    writeFileSync(entry, `import { Child } from './child'; export const Entry = () => <Child/>;`);
    writeFileSync(child, `export const Child = () => <span/>;`);
    const transformed: string[] = [];

    const bundle = await rolldown({
      input: `${entry}?style=vanilla&framework=react`,
      external: /^react\//,
      plugins: [
        vjscPlugin({
          transform: ({ parameters }) =>
            parameters.get('framework') === 'react' ? { target: jsx({ importSource: 'react' }) } : null,
        }),
        {
          name: 'record-projected-modules',
          transform: {
            filter: { id: /\?framework=react&style=vanilla$/ },
            handler(_code, id) {
              transformed.push(id);
            },
          },
        },
      ],
    });
    const output = await bundle.generate({ format: 'es' });

    expect(output.output[0]?.code).toContain('react/jsx-runtime');
    expect(transformed).toHaveLength(2);
    expect(transformed).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/child\.tsx\?framework=react&style=vanilla$/),
        expect.stringMatching(/\/entry\.tsx\?framework=react&style=vanilla$/),
      ])
    );
  });

  it.each([
    ['Rolldown', buildWithRolldown],
    ['Vite', buildWithVite],
  ])('captures editable transformed source through the %s module graph', async (_host, build) => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-capture-'));
    const app = join(root, 'app.ts');
    const entry = join(root, 'entry.tsx');
    const child = join(root, 'child.tsx');
    writeFileSync(app, `export const app = 'unrelated';`);
    writeFileSync(
      entry,
      `import { Child } from './child';\nexport const meta = { name: 'entry' };\nexport interface EntryProps { label: string; }\nexport function Entry(props: EntryProps) { return <Child label={props.label}/>; }`
    );
    writeFileSync(
      child,
      `export const meta = { name: 'child' };\nexport interface ChildProps { label: string; }\nexport function Child(props: ChildProps) { return <span>{props.label}</span>; }`
    );
    const projection = '?framework=react&skin=default-video&style=tailwind';
    const capture = createSourceCapture(`${entry}${projection}`, projection);

    const output = await build({
      app,
      plugins: [
        {
          transform: ({ parameters }) =>
            parameters.get('framework') === 'react'
              ? { target: jsx({ importSource: 'react' }), plugins: [componentMetaPlugin()] }
              : null,
        },
        capture.plugin,
      ],
    });

    expect([...capture.sources.keys()]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/entry\.tsx\?framework=react&skin=default-video&style=tailwind$/),
        expect.stringMatching(/\/child\.tsx\?framework=react&skin=default-video&style=tailwind$/),
      ])
    );
    const entrySource = [...capture.sources].find(([id]) => id.includes('/entry.tsx?'))?.[1];
    const childSource = [...capture.sources].find(([id]) => id.includes('/child.tsx?'))?.[1];
    expect(entrySource).toContain('interface EntryProps');
    expect(entrySource).toContain('<Child label={props.label}/>');
    expect(entrySource).not.toContain('const meta');
    expect(childSource).toContain('<span>{props.label}</span>');
    expect(childSource).not.toContain('const meta');
    expect(capture.dependencies).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/child\.tsx\?framework=react&skin=default-video&style=tailwind$/),
      ])
    );
    expect(capture.sourceEntries).toEqual([false, false]);
    expect(output.output.filter((item) => item.type === 'chunk').map((item) => item.fileName)).toEqual(['app.js']);
    expect(output.output.some((item) => item.type === 'chunk' && item.code.includes('jsx-runtime'))).toBe(false);
  });

  it('creates a schema entry directly from inline bundler configuration', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-schema-plugin-'));
    const sourceDir = join(root, 'play-button');
    const source = join(sourceDir, 'play-button-component.ts');
    mkdirSync(sourceDir);
    writeFileSync(
      source,
      `const defineComponent: any = (value: any) => value; export default defineComponent({ name: 'PlayButton' });`
    );
    const plugin = schemaPlugin({
      cwd: root,
      source: '@fixture/components',
      include: ['./*/*-component.ts'],
    });

    const bundle = await rolldown({ input: plugin.moduleId, plugins: [plugin] });
    const output = await bundle.generate({ format: 'es' });

    expect(output.output[0]?.code).toContain('PlayButton');
    expect(plugin.moduleId).toBe('virtual:vjsc/schema');
  });
});

interface HostBuildOptions {
  readonly app: string;
  readonly plugins: readonly [Parameters<typeof vjscPlugin>[0], Plugin];
}

async function buildWithRolldown({ app, plugins: [options, capture] }: HostBuildOptions): Promise<RolldownOutput> {
  const bundle = await rolldown({
    input: app,
    external: /^react(?:\/|$)/,
    plugins: [vjscPlugin(options), capture],
  });
  return bundle.generate({ format: 'es', entryFileNames: '[name].js' });
}

async function buildWithVite({ app, plugins: [options, capture] }: HostBuildOptions): Promise<RolldownOutput> {
  return (await viteBuild({
    configFile: false,
    logLevel: 'silent',
    plugins: [viteVjscPlugin(options), capture],
    build: {
      write: false,
      rolldownOptions: {
        input: app,
        external: /^react(?:\/|$)/,
        output: { format: 'es', entryFileNames: '[name].js' },
      },
    },
  })) as RolldownOutput;
}

function createSourceCapture(entry: string, projection: string) {
  const triggerId = 'virtual:vjsc/test-source-capture';
  const resolvedTriggerId = `\0${triggerId}`;
  const sources = new Map<string, string>();
  let dependencies: string[] = [];
  let sourceEntries: boolean[] = [];

  const plugin: Plugin = {
    name: 'test-source-capture',
    buildStart() {
      this.emitFile({ type: 'chunk', id: triggerId });
    },
    async buildEnd() {
      const resolved = await this.resolve(entry);
      if (!resolved) this.error(`Could not resolve source capture entry: ${entry}`);
      const entryInfo = this.getModuleInfo(resolved.id);
      if (!entryInfo) this.error(`Source capture entry is missing from the graph: ${resolved.id}`);
      dependencies = [...entryInfo.importedIds];
      sourceEntries = [
        entryInfo.isEntry,
        ...entryInfo.importedIds
          .filter((id) => id.includes('/child.tsx?'))
          .map((id) => this.getModuleInfo(id)?.isEntry ?? true),
      ];
    },
    resolveId(id) {
      return id === triggerId ? resolvedTriggerId : null;
    },
    load(id) {
      return id === resolvedTriggerId ? `import ${JSON.stringify(entry)}; export default null;` : null;
    },
    transform: {
      order: 'pre',
      handler(code, id) {
        if (id.endsWith(projection)) sources.set(id, code);
        return null;
      },
    },
    generateBundle(_options, bundle) {
      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type === 'chunk' && item.facadeModuleId === resolvedTriggerId) delete bundle[fileName];
      }
    },
  };

  return {
    plugin,
    sources,
    get dependencies() {
      return dependencies;
    },
    get sourceEntries() {
      return sourceEntries;
    },
  };
}
