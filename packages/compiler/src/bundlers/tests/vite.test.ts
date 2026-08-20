import { describe, expect, it, vi } from 'vitest';
import type { CompilerPlugin, CompilerSourceMap } from '../../config';
import { jsx } from '../../config';
import { vjsCompiler } from '../vite';

type TestPlugin = {
  config(): { optimizeDeps: { exclude: string[] | undefined } };
  configResolved(config: { root: string }): void;
  resolveId(id: string): string | null;
  load(this: { addWatchFile(id: string): void }, id: string): Promise<string | null>;
  handleHotUpdate(context: {
    file: string;
    modules: object[];
    server: {
      moduleGraph: {
        getModuleById(id: string): object | undefined;
        invalidateModule(module: object): void;
      };
    };
  }): object[];
  transform(
    this: { addWatchFile(id: string): void; error(error: unknown): never; warn(warning: unknown): void },
    code: string,
    id: string
  ): Promise<{ code: string; map: CompilerSourceMap } | null>;
};

const createPlugin = (...args: Parameters<typeof vjsCompiler>): TestPlugin =>
  vjsCompiler(...args) as unknown as TestPlugin;

const createContext = () => ({
  addWatchFile: vi.fn(),
  error: vi.fn((error: unknown): never => {
    throw error;
  }),
  warn: vi.fn(),
});

const createCssPlugin = (source: string): CompilerPlugin => ({
  name: 'fixture',
  setup(context) {
    return {
      transform: () => (sourceFile) => sourceFile,
      finish() {
        context.addAsset({ type: 'css', fileName: 'skin.css', source });
      },
    };
  },
});

describe('vjsCompiler', () => {
  it('uses Vite filter patterns for included and excluded modules', async () => {
    const plugin = createPlugin({
      config: {},
      include: '**/*.tsx',
      exclude: '**/*.test.tsx',
    });

    expect(await plugin.transform.call(createContext(), 'export const value = 1;', '/workspace/value.ts')).toBeNull();
    expect(
      await plugin.transform.call(createContext(), 'export const View = <div/>;', '/workspace/view.test.tsx')
    ).toBeNull();
    expect(
      await plugin.transform.call(createContext(), 'export const View = <div/>;', '/workspace/view.tsx')
    ).not.toBeNull();
  });

  it('imports emitted CSS assets as virtual modules', async () => {
    const plugin = createPlugin({ config: { plugins: [createCssPlugin('.foo{display:flex;}')] } });

    const result = await plugin.transform.call(
      createContext(),
      `function App(){ return <Foo className="foo"/>; }`,
      '/workspace/skin.tsx'
    );

    expect(result).not.toBeNull();
    const match = result!.code.match(/^import "([^"]+)";/);
    expect(match).not.toBeNull();

    const id = match![1]!;
    expect(id).toContain('virtual:vjsc/css/');
    expect(plugin.resolveId(id)).toBe(`\0${id}`);
    await expect(plugin.load.call(createContext(), `\0${id}`)).resolves.toBe('.foo{display:flex;}');
    expect(result!.code).toContain('function App');
    expect(result!.map.mappings).toMatch(/^;/);
  });

  it('changes the virtual CSS identity when emitted content changes', async () => {
    let css = '.foo{color:red;}';
    const plugin = createPlugin({
      config: {
        plugins: [
          {
            name: 'fixture-css',
            setup(context) {
              return {
                finish() {
                  context.addAsset({ type: 'css', fileName: 'skin.css', source: css });
                },
              };
            },
          },
        ],
      },
    });
    const id = '/workspace/skin.tsx';
    const source = `function App(){ return <Foo/>; }`;

    const first = await plugin.transform.call(createContext(), source, id);
    const firstCssId = first!.code.match(/^import "([^"]+)";/)![1]!;
    css = '.foo{color:blue;}';
    const second = await plugin.transform.call(createContext(), source, id);
    const secondCssId = second!.code.match(/^import "([^"]+)";/)![1]!;

    expect(secondCssId).not.toBe(firstCssId);
    expect(plugin.resolveId(firstCssId)).toBeNull();
    await expect(plugin.load.call(createContext(), `\0${secondCssId}`)).resolves.toBe(css);
  });

  it('shares identical emitted assets between transformed modules', async () => {
    let css = '.foo{color:red;}';
    const plugin = createPlugin({
      config: {
        plugins: [
          {
            name: 'fixture-css',
            setup(context) {
              return {
                finish() {
                  context.addAsset({ type: 'css', fileName: 'shared.css', source: css });
                },
              };
            },
          },
        ],
      },
    });
    const first = await plugin.transform.call(createContext(), 'export const first = <Foo/>;', '/workspace/first.tsx');
    const second = await plugin.transform.call(
      createContext(),
      'export const second = <Foo/>;',
      '/workspace/second.tsx'
    );
    const firstCssId = first!.code.match(/^import "([^"]+)";/)![1]!;
    const secondCssId = second!.code.match(/^import "([^"]+)";/)![1]!;

    expect(secondCssId).toBe(firstCssId);
    css = '.foo{color:blue;}';
    await plugin.transform.call(createContext(), 'export const first = <Foo/>;', '/workspace/first.tsx');
    await expect(plugin.load.call(createContext(), `\0${secondCssId}`)).resolves.toBe('.foo{color:red;}');
  });

  it('loads generated modules and invalidates them when their inputs change', async () => {
    let code = 'export const value = 1;';
    const plugin = createPlugin({
      entries: [
        {
          id: 'virtual:vjsc/value',
          load: () => ({ code, watchFiles: ['/workspace/value.ts'] }),
        },
      ],
    });
    const loadContext = createContext();

    expect(plugin.resolveId('virtual:vjsc/value')).toBe('\0virtual:vjsc/value');
    await expect(plugin.load.call(loadContext, '\0virtual:vjsc/value')).resolves.toBe(code);
    expect(loadContext.addWatchFile).toHaveBeenCalledWith('/workspace/value.ts');

    const module = {};
    const invalidateModule = vi.fn();
    code = 'export const value = 2;';
    expect(
      plugin.handleHotUpdate({
        file: '/workspace/value.ts',
        modules: [],
        server: {
          moduleGraph: {
            getModuleById: vi.fn(() => module),
            invalidateModule,
          },
        },
      })
    ).toEqual([module]);
    expect(invalidateModule).toHaveBeenCalledWith(module);
    await expect(plugin.load.call(loadContext, '\0virtual:vjsc/value')).resolves.toContain('value = 2');
  });

  it('keeps virtual JSX in Vite transforms and out of dependency optimization', async () => {
    const id = 'virtual:vjsc/skin/default.tsx';
    const plugin = createPlugin({
      entries: [{ id, load: () => ({ code: 'export const Skin = <div/>;', watchFiles: [] }) }],
    });

    expect(plugin.config().optimizeDeps.exclude).toEqual([id]);
    expect(plugin.resolveId(id)).toBe(id);
    await expect(plugin.load.call(createContext(), id)).resolves.toContain('<div/>');
  });

  it('invalidates transformed owners when a compiler dependency changes', async () => {
    const dependency = '/workspace/styles.ts';
    const owner = '/workspace/skin.tsx';
    const plugin = createPlugin({
      config: {
        plugins: [
          {
            name: 'watch-dependency',
            setup(context) {
              context.addWatchFile(dependency);
              return {};
            },
          },
        ],
      },
    });
    await plugin.transform.call(createContext(), 'export const Skin = <div/>;', owner);

    const ownerModule = {};
    const invalidateModule = vi.fn();
    expect(
      plugin.handleHotUpdate({
        file: dependency,
        modules: [],
        server: {
          moduleGraph: {
            getModuleById: vi.fn((id) => (id === owner ? ownerModule : undefined)),
            invalidateModule,
          },
        },
      })
    ).toEqual([ownerModule]);
    expect(invalidateModule).toHaveBeenCalledWith(ownerModule);
  });

  it('forwards compiler warnings to Vite', async () => {
    const warn = vi.fn();
    const plugin = createPlugin({
      config: {
        plugins: [
          {
            name: 'fixture',
            setup(context) {
              context.report({ level: 'warning', code: 'fixture-warning', message: 'Check this', plugin: 'fixture' });
              return { transform: () => (sourceFile) => sourceFile };
            },
          },
        ],
      },
    });

    await plugin.transform.call(
      { ...createContext(), warn },
      `function App(){ return <Foo/>; }`,
      '/workspace/skin.tsx'
    );

    expect(warn).toHaveBeenCalledWith('Check this');
  });

  it('forwards located compiler warnings to Vite', async () => {
    const warn = vi.fn();
    const plugin = createPlugin({
      config: {
        plugins: [
          {
            name: 'fixture',
            setup(context) {
              context.report({
                level: 'warning',
                code: 'fixture-warning',
                message: 'Check this location',
                file: context.filename,
                line: 1,
                column: 24,
                plugin: 'fixture',
              });
              return { transform: () => (sourceFile) => sourceFile };
            },
          },
        ],
      },
    });

    await plugin.transform.call(
      { ...createContext(), warn },
      `function App(){ return <Foo/>; }`,
      '/workspace/skin.tsx'
    );

    expect(warn).toHaveBeenCalledWith({
      message: 'Check this location',
      id: '/workspace/skin.tsx',
      loc: { file: '/workspace/skin.tsx', line: 1, column: 24 },
      pluginCode: 'fixture-warning',
    });
  });

  it('fails the Vite transform for compiler errors', async () => {
    const context = createContext();
    const plugin = createPlugin({
      config: {
        plugins: [
          {
            name: 'fixture',
            setup(compilerContext) {
              compilerContext.report({
                level: 'error',
                code: 'fixture-error',
                message: 'Cannot compile this source',
                plugin: 'fixture',
              });
              return { transform: () => (sourceFile) => sourceFile };
            },
          },
        ],
      },
    });

    await expect(
      plugin.transform.call(context, `function App(){ return <Foo/>; }`, '/workspace/skin.tsx')
    ).rejects.toBe('Cannot compile this source');
    expect(context.error).toHaveBeenCalledWith('Cannot compile this source');
  });

  it('forwards syntax errors to Vite with their source location', async () => {
    const context = createContext();
    const plugin = createPlugin({ config: {} });

    await expect(
      plugin.transform.call(context, `export function App( { return <Foo/> }`, '/workspace/broken.tsx')
    ).rejects.toMatchObject({
      id: '/workspace/broken.tsx',
      loc: expect.objectContaining({ file: '/workspace/broken.tsx', line: 1 }),
    });
  });

  it('rebases relative import targets from the transformed module', async () => {
    const plugin = createPlugin({
      config: {
        target: jsx({ imports: { '@fixture/widgets': './shared/widgets' } }),
      },
    });
    plugin.configResolved({ root: '/workspace' });

    const result = await plugin.transform.call(
      createContext(),
      `import { Widget } from '@fixture/widgets';\nexport const view = <Widget/>;`,
      '/workspace/src/skin.tsx'
    );

    expect(result!.code).toContain(`from "../shared/widgets"`);
  });
});
