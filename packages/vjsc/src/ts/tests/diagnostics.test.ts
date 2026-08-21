import type ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { CompilerError, transform, transformPlugin } from '../../index';
import {
  DiagnosticError,
  diagnosticLocationFromNode,
  formatCompilerDiagnostic,
  formatCompilerDiagnosticJsonLine,
  formatDiagnosticSummaryJsonLine,
} from '../diagnostics';

describe('formatCompilerDiagnostic', () => {
  it('renders a diagnostic code frame', () => {
    const output = formatCompilerDiagnostic(
      {
        level: 'error',
        code: 'fixture-error',
        message: 'Something went wrong',
        file: '/workspace/skin.tsx',
        line: 2,
        column: 3,
        sourceText: `const a = 1;\nconst b = 2;\nconst c = 3;`,
      },
      { color: false, cwd: '/workspace' }
    );

    expect(output).toContain('[videojs/compiler] ERROR');
    expect(output).toContain('MESSAGE');
    expect(output).toContain('Something went wrong');
    expect(output).toContain('CODE');
    expect(output).toContain('skin.tsx L:2:3');
    expect(output).toContain('> 2 |  const b = 2;');
  });
});

describe('formatCompilerDiagnosticJsonLine', () => {
  it('renders parseable agent diagnostics without source text', () => {
    const line = formatCompilerDiagnosticJsonLine(
      {
        level: 'warning',
        code: 'fixture-warning',
        message: 'Check this',
        plugin: 'fixture',
        file: '/workspace/skin.tsx',
        line: 2,
        column: 3,
        endLine: 2,
        endColumn: 12,
        sourceText: `const a = 1;\nconst b = 2;\nconst c = 3;`,
      },
      { cwd: '/workspace' }
    );

    expect(line).toMatch(/\n$/);
    expect(line).not.toContain('\u001b');
    expect(line).not.toContain('sourceText');
    expect(JSON.parse(line)).toEqual({
      type: 'diagnostic',
      level: 'warning',
      code: 'fixture-warning',
      message: 'Check this',
      plugin: 'fixture',
      file: 'skin.tsx',
      range: {
        start: { line: 2, column: 3 },
        end: { line: 2, column: 12 },
      },
      frame: [
        { line: 1, text: 'const a = 1;', highlight: false },
        { line: 2, text: 'const b = 2;', highlight: true },
        { line: 3, text: 'const c = 3;', highlight: false },
      ],
    });
  });

  it('renders summary events', () => {
    const line = formatDiagnosticSummaryJsonLine([
      { level: 'error', code: 'a', message: 'A' },
      { level: 'warning', code: 'b', message: 'B' },
      { level: 'warning', code: 'c', message: 'C' },
    ]);

    expect(JSON.parse(line)).toEqual({ type: 'summary', errors: 1, warnings: 2 });
  });
});

describe('CompilerError diagnostics', () => {
  it('rejects syntax-invalid TSX before transforms run', async () => {
    try {
      await transform(`export function App( { return <Foo/> }`, {
        id: '/workspace/broken.tsx',
      });
      throw new Error('Expected transform to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(CompilerError);
      expect((error as CompilerError).diagnostics[0]).toMatchObject({
        level: 'error',
        code: expect.stringMatching(/^TS\d+$/),
        file: '/workspace/broken.tsx',
        line: 1,
        plugin: 'typescript',
      });
    }
  });

  it('attributes reported and thrown failures to their plugin', async () => {
    const reported = await transform(`export const value = 1;`, {
      id: '/workspace/input.tsx',
      plugins: [
        {
          name: 'fixture-report',
          transform(_module, context) {
            context.report({ level: 'warning', code: 'fixture-warning', message: 'Check this' });
            return null;
          },
        },
      ],
    });
    expect(reported.diagnostics[0]?.plugin).toBe('fixture-report');

    const failingPlugin = {
      name: 'fixture-transform',
      transform() {
        throw new Error('Transform failed');
      },
    };
    await expect(
      transform(`export const value = 1;`, {
        id: '/workspace/input.tsx',
        plugins: [failingPlugin],
      })
    ).rejects.toMatchObject({
      diagnostics: [expect.objectContaining({ message: 'Transform failed', plugin: 'fixture-transform' })],
    });
  });

  it('attributes async transform failures even when no AST was produced', async () => {
    await expect(
      transform(`export const value = 1;`, {
        id: '/workspace/input.tsx',
        plugins: [
          {
            name: 'fixture-async',
            async transform() {
              throw new Error('Async transform failed');
            },
          },
        ],
      })
    ).rejects.toMatchObject({
      diagnostics: [expect.objectContaining({ message: 'Async transform failed', plugin: 'fixture-async' })],
    });
  });

  it('preserves source ranges thrown from transforms', async () => {
    const failingTransform = (): ts.TransformerFactory<ts.SourceFile> => () => (sourceFile) => {
      throw new DiagnosticError('Fixture transform failed', {
        ...diagnosticLocationFromNode(sourceFile.statements[0]!),
        diagnosticCode: 'fixture-transform',
      });
    };

    try {
      await transform(`export function App(){ return <Foo/>; }`, {
        id: '/workspace/skin.tsx',
        plugins: [transformPlugin('fixture-transform', failingTransform())],
      });
      throw new Error('Expected transform to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(CompilerError);
      const diagnostic = (error as CompilerError).diagnostics[0]!;
      expect(diagnostic.code).toBe('fixture-transform');
      expect(diagnostic.file).toBe('/workspace/skin.tsx');
      expect(diagnostic.line).toBe(1);
      expect(diagnostic.sourceText).toContain('export function App');
    }
  });
});
