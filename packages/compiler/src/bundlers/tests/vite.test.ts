import { describe, expect, it, vi } from 'vitest';
import type { CompilerPlugin, CompilerSourceMap } from '../../config';
import { jsx } from '../../config';
import { vjsCompiler } from '../vite';

type TestPlugin = {
  configResolved(config: { root: string }): void;
  resolveId(id: string): string | null;
  load(id: string): string | null;
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
    expect(id).toContain('virtual:@videojs/compiler/css/');
    expect(plugin.resolveId(id)).toBe(`\0${id}`);
    expect(plugin.load(`\0${id}`)).toBe('.foo{display:flex;}');
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
    expect(plugin.load(`\0${secondCssId}`)).toBe(css);
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
