import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const cliPath = fileURLToPath(new URL('../cli.ts', import.meta.url));
const tsxPath = pathToFileURL(require.resolve('tsx')).href;

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'compiler-cli-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('vjs compile', () => {
  it('writes compiled code and emitted CSS assets', () => {
    const inputPath = join(workDir, 'src', 'skin.tsx');
    const configPath = join(workDir, 'compiler.config.mjs');
    const outputPath = join(workDir, 'dist', 'skin.js');
    mkdirSync(dirname(inputPath), { recursive: true });
    writeFileSync(inputPath, `export function App(){ return <Foo className="foo"/>; }\n`, 'utf8');
    writeFileSync(
      configPath,
      `export default {
  styles: {
    name: 'fixture',
    setup(context) {
      return {
        transform: () => (sourceFile) => sourceFile,
        finish() {
          context.addAsset({ type: 'css', fileName: 'skin.css', source: '.foo{display:flex;}' });
        },
      };
    },
  },
};
`,
      'utf8'
    );

    execFileSync(
      process.execPath,
      ['--import', tsxPath, cliPath, 'compile', inputPath, '--config', configPath, '--out', outputPath],
      {
        encoding: 'utf8',
      }
    );

    expect(readFileSync(outputPath, 'utf8')).toContain('function App');
    expect(readFileSync(join(workDir, 'dist', 'skin.css'), 'utf8')).toBe('.foo{display:flex;}');
  });

  it('prints compiler diagnostics with code frames', () => {
    const inputPath = join(workDir, 'src', 'skin.tsx');
    const configPath = join(workDir, 'compiler.config.mjs');
    mkdirSync(dirname(inputPath), { recursive: true });
    writeFileSync(inputPath, `export function App(){ return <Foo className="foo"/>; }\n`, 'utf8');
    writeFileSync(
      configPath,
      `import { readFileSync } from 'node:fs';

export default {
  styles: {
    name: 'fixture',
    setup(context) {
      const error = new Error('Fixture failed');
      error.fileName = context.filename;
      error.line = 1;
      error.column = 30;
      error.sourceText = readFileSync(context.filename, 'utf8');
      throw error;
    },
  },
};
`,
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      ['--import', tsxPath, cliPath, 'compile', inputPath, '--config', configPath],
      {
        encoding: 'utf8',
      }
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[fixture] ERROR');
    expect(result.stderr).toContain('MESSAGE');
    expect(result.stderr).toContain('Fixture failed');
    expect(result.stderr).toContain('CODE');
    expect(result.stderr).toContain('> 1 |  export function App');
  });

  it('prints jsonl compiler diagnostics for agents', () => {
    const inputPath = join(workDir, 'src', 'skin.tsx');
    const configPath = join(workDir, 'compiler.config.mjs');
    mkdirSync(dirname(inputPath), { recursive: true });
    writeFileSync(inputPath, `export function App(){ return <Foo className="foo"/>; }\n`, 'utf8');
    writeFileSync(
      configPath,
      `import { readFileSync } from 'node:fs';

export default {
  styles: {
    name: 'fixture',
    setup(context) {
      const error = new Error('Fixture failed');
      error.fileName = context.filename;
      error.line = 1;
      error.column = 30;
      error.sourceText = readFileSync(context.filename, 'utf8');
      throw error;
    },
  },
};
`,
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      ['--import', tsxPath, cliPath, 'compile', inputPath, '--config', configPath, '--diagnostics', 'jsonl'],
      {
        encoding: 'utf8',
      }
    );

    const events = result.stderr
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    expect(result.status).toBe(1);
    expect(events[0]).toMatchObject({
      type: 'diagnostic',
      level: 'error',
      code: 'compiler-fatal',
      plugin: 'fixture',
      message: 'Fixture failed',
      range: { start: { line: 1, column: 30 } },
    });
    expect(events[0].frame).toContainEqual({
      line: 1,
      text: `export function App(){ return <Foo className="foo"/>; }`,
      highlight: true,
    });
    expect(events[0]).not.toHaveProperty('sourceText');
    expect(events[1]).toEqual({ type: 'summary', errors: 1, warnings: 0 });
  });
});
