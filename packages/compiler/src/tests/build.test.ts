import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build, html, rewrite } from '..';
import type { CompilerPlugin } from '../config';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'compiler-build-'));
  mkdirSync(join(workDir, 'src'), { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('build', () => {
  it('bundles the complete local module graph for an entry', async () => {
    writeFileSync(join(workDir, 'src', 'message.ts'), `export const message = 'ready';\n`, 'utf8');
    writeFileSync(
      join(workDir, 'src', 'input.tsx'),
      `import { message } from './message';\nexport const App = () => <Root>{message}</Root>;\n`,
      'utf8'
    );

    const result = await build(
      {
        input: 'src/input.tsx',
        output: { file: 'dist/output.tsx' },
      },
      { configDir: workDir }
    );

    expect(result.files).toHaveLength(1);
    expect(result.files[0]!.source).toContain('const message = "ready"');
    expect(result.files[0]!.source).not.toContain(`from './message'`);
  });

  it('renders an HTML target after transforming its module graph', async () => {
    writeFileSync(
      join(workDir, 'src', 'input.tsx'),
      `export function Skin(){ return <Panel className={['root', false, 'ready']}>Hello & goodbye</Panel>; }\n`,
      'utf8'
    );

    const result = await build(
      {
        input: 'src/input.tsx',
        output: { file: 'dist/output.html' },
        target: html(),
        plugins: [rewrite((code) => [code.jsx.element('Panel').replace('section')])],
      },
      { configDir: workDir }
    );

    expect(result.files[0]!.source).toBe('<section class="root ready">Hello &amp; goodbye</section>');
  });

  it('compiles configured entries and emitted assets', async () => {
    writeFileSync(join(workDir, 'src', 'input.tsx'), `export function App(){ return <Root/>; }\n`, 'utf8');

    const assetPlugin: CompilerPlugin = {
      name: 'fixture-assets',
      setup(context) {
        return {
          finish() {
            context.addAsset({ type: 'css', fileName: 'styles.css', source: '.root{}' });
          },
        };
      },
    };
    const result = await build(
      {
        input: { template: 'src/input.tsx' },
        output: {
          dir: 'dist',
          entryFileNames: '[name].tsx',
          banner: '// Generated\n',
        },
        plugins: [rewrite((code) => [code.jsx.element('Root').addProp('data-root', '')]), assetPlugin],
      },
      { configDir: workDir }
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.files).toEqual([
      expect.objectContaining({
        type: 'chunk',
        fileName: join(workDir, 'dist', 'template.tsx'),
        source: expect.stringContaining('data-root=""'),
      }),
      { type: 'asset', fileName: join(workDir, 'dist', 'styles.css'), source: '.root{}' },
    ]);
    expect(result.files[0]!.source).toContain('// Generated');
  });

  it('compiles multiple build configs in authored order', async () => {
    writeFileSync(join(workDir, 'src', 'input.tsx'), `export function App(){ return <Root/>; }\n`, 'utf8');

    const config = [
      {
        input: { template: 'src/input.tsx' },
        output: { dir: 'dist/one', entryFileNames: '[name].tsx' },
        plugins: [rewrite((code) => [code.jsx.element('Root').addProp('data-one', '')])],
      },
      {
        input: { template: 'src/input.tsx' },
        output: { dir: 'dist/two', entryFileNames: '[name].tsx' },
        plugins: [rewrite((code) => [code.jsx.element('Root').addProp('data-two', '')])],
      },
    ] as const;

    const first = await build(config, { configDir: workDir });
    const second = await build(config, { configDir: workDir });

    expect(first).toEqual(second);
    expect(first.files.map((file) => file.fileName)).toEqual([
      join(workDir, 'dist', 'one', 'template.tsx'),
      join(workDir, 'dist', 'two', 'template.tsx'),
    ]);
    expect(first.files[0]!.source).toContain('data-one=""');
    expect(first.files[1]!.source).toContain('data-two=""');
  });

  it('rejects colliding output files across build configs', async () => {
    writeFileSync(join(workDir, 'src', 'input.tsx'), `export function App(){ return <Root/>; }\n`, 'utf8');

    await expect(
      build(
        [
          { input: 'src/input.tsx', output: { file: 'dist/output.tsx' } },
          { input: 'src/input.tsx', output: { file: 'dist/output.tsx' } },
        ],
        { configDir: workDir }
      )
    ).rejects.toThrow('Compiler build output collision');
  });
});
