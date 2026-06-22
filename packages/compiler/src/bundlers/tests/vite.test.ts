import { describe, expect, it, vi } from 'vitest';
import type { CompilerPlugin } from '../../config';
import { vjsCompiler } from '../vite';

type TestPlugin = {
  resolveId(id: string): string | null;
  load(id: string): string | null;
  transform(
    this: { warn(warning: unknown): void },
    code: string,
    id: string
  ): Promise<{ code: string; map: null } | null>;
};

const createPlugin = (...args: Parameters<typeof vjsCompiler>): TestPlugin =>
  vjsCompiler(...args) as unknown as TestPlugin;

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
      { warn: () => {} },
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

    await plugin.transform.call({ warn }, `function App(){ return <Foo/>; }`, '/workspace/skin.tsx');

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

    await plugin.transform.call({ warn }, `function App(){ return <Foo/>; }`, '/workspace/skin.tsx');

    expect(warn).toHaveBeenCalledWith({
      message: 'Check this location',
      id: '/workspace/skin.tsx',
      loc: { file: '/workspace/skin.tsx', line: 1, column: 24 },
      pluginCode: 'fixture-warning',
    });
  });
});
