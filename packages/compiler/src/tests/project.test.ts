import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compileProject, transform } from '..';
import type { CompilerPlugin } from '../config';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'compiler-project-'));
  mkdirSync(join(workDir, 'src'), { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('compileProject', () => {
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
    const result = await compileProject(
      {
        input: { template: 'src/input.tsx' },
        output: {
          dir: 'dist',
          entryFileNames: '[name].tsx',
          banner: '// Generated\n',
        },
        plugins: [transform((code) => [code.jsx.element('Root').addProp('data-root', '')]), assetPlugin],
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

  it('compiles multiple project configs in authored order', async () => {
    writeFileSync(join(workDir, 'src', 'input.tsx'), `export function App(){ return <Root/>; }\n`, 'utf8');

    const config = [
      {
        input: { template: 'src/input.tsx' },
        output: { dir: 'dist/one', entryFileNames: '[name].tsx' },
        plugins: [transform((code) => [code.jsx.element('Root').addProp('data-one', '')])],
      },
      {
        input: { template: 'src/input.tsx' },
        output: { dir: 'dist/two', entryFileNames: '[name].tsx' },
        plugins: [transform((code) => [code.jsx.element('Root').addProp('data-two', '')])],
      },
    ] as const;

    const first = await compileProject(config, { configDir: workDir });
    const second = await compileProject(config, { configDir: workDir });

    expect(first).toEqual(second);
    expect(first.files.map((file) => file.fileName)).toEqual([
      join(workDir, 'dist', 'one', 'template.tsx'),
      join(workDir, 'dist', 'two', 'template.tsx'),
    ]);
    expect(first.files[0]!.source).toContain('data-one=""');
    expect(first.files[1]!.source).toContain('data-two=""');
  });

  it('rejects colliding output files across project configs', async () => {
    writeFileSync(join(workDir, 'src', 'input.tsx'), `export function App(){ return <Root/>; }\n`, 'utf8');

    await expect(
      compileProject(
        [
          { input: 'src/input.tsx', output: { file: 'dist/output.tsx' } },
          { input: 'src/input.tsx', output: { file: 'dist/output.tsx' } },
        ],
        { configDir: workDir }
      )
    ).rejects.toThrow('Compiler project output collision');
  });
});
