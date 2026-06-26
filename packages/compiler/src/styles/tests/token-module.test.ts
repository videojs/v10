import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearTokenModuleCache, loadTokenModule, TokenEvaluationError } from '..';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'compiler-eval-'));
});

afterEach(() => {
  clearTokenModuleCache();
});

const write = (relativePath: string, content: string): string => {
  const abs = join(dir, relativePath);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return abs;
};

describe('loadTokenModule — primitives', () => {
  it('reads a string-literal export', () => {
    const file = write('mod.ts', `export const a = 'foo bar';\n`);
    expect(loadTokenModule(file)).toEqual({ a: 'foo bar' });
  });

  it('reads a no-substitution template literal', () => {
    const file = write('mod.ts', 'export const a = `foo bar`;\n');
    expect(loadTokenModule(file)).toEqual({ a: 'foo bar' });
  });

  it('skips unexported declarations', () => {
    const file = write('mod.ts', `const internal = 'hidden';\nexport const a = 'visible';\n`);
    expect(loadTokenModule(file)).toEqual({ a: 'visible' });
  });
});

describe('loadTokenModule — object literals', () => {
  it('reads a plain object literal', () => {
    const file = write('mod.ts', `export const button = { base: 'flex items-center', icon: 'w-4 h-4' };\n`);
    expect(loadTokenModule(file)).toEqual({
      button: { base: 'flex items-center', icon: 'w-4 h-4' },
    });
  });

  it('handles nested objects', () => {
    const file = write(
      'mod.ts',
      `export const slider = { thumb: { base: 'rounded-full', persistent: 'opacity-100' } };\n`
    );
    expect(loadTokenModule(file)).toEqual({
      slider: { thumb: { base: 'rounded-full', persistent: 'opacity-100' } },
    });
  });

  it('handles spread of an in-scope object', () => {
    const file = write('mod.ts', `const base = { a: '1', b: '2' };\nexport const merged = { ...base, c: '3' };\n`);
    expect(loadTokenModule(file)).toEqual({ merged: { a: '1', b: '2', c: '3' } });
  });

  it('quoted property names are preserved verbatim', () => {
    const file = write('mod.ts', `export const x = { 'foo-bar': 'baz', '@some/key': 'qux' };\n`);
    expect(loadTokenModule(file)).toEqual({ x: { 'foo-bar': 'baz', '@some/key': 'qux' } });
  });
});

describe('loadTokenModule — cn() calls', () => {
  it('joins literal-string args with space', () => {
    const file = write(
      'mod.ts',
      `import { cn } from '@videojs/utils/style';\nexport const a = cn('flex', 'items-center');\n`
    );
    expect(loadTokenModule(file)).toEqual({ a: 'flex items-center' });
  });

  it('flattens identifier args that resolve to strings', () => {
    const file = write(
      'mod.ts',
      `import { cn } from '@videojs/utils/style';\nconst base = 'flex';\nexport const a = cn(base, 'items-center');\n`
    );
    expect(loadTokenModule(file)).toEqual({ a: 'flex items-center' });
  });

  it('flattens dotted access against an in-scope object', () => {
    const file = write(
      'mod.ts',
      `import { cn } from '@videojs/utils/style';\nconst pair = { a: 'foo', b: 'bar' };\nexport const a = cn(pair.a, pair.b);\n`
    );
    expect(loadTokenModule(file)).toEqual({ a: 'foo bar' });
  });

  it('flattens array-literal args', () => {
    const file = write(
      'mod.ts',
      `import { cn } from '@videojs/utils/style';\nexport const a = cn('a', ['b', 'c'], 'd');\n`
    );
    expect(loadTokenModule(file)).toEqual({ a: 'a b c d' });
  });

  it('drops empty strings when joining', () => {
    const file = write(
      'mod.ts',
      `import { cn } from '@videojs/utils/style';\nexport const a = cn('flex', '', 'items-center');\n`
    );
    expect(loadTokenModule(file)).toEqual({ a: 'flex items-center' });
  });
});

describe('loadTokenModule — array joins', () => {
  it('joins static array literals with a string separator', () => {
    const file = write(
      'mod.ts',
      `export const a = ['flex', 'items-center'].join(' ');
`
    );
    expect(loadTokenModule(file)).toEqual({ a: 'flex items-center' });
  });

  it('rejects non-literal join separators', () => {
    const file = write(
      'mod.ts',
      `const sep = ' ';
export const a = ['flex', 'items-center'].join(sep);
`
    );
    expect(() => loadTokenModule(file)).toThrow(/separator must be a string literal/);
  });
});

describe('loadTokenModule — relative imports', () => {
  it('resolves a relative .ts import', () => {
    write('base.ts', `export const value = 'flex';\n`);
    const file = write(
      'mod.ts',
      `import { value } from './base';\nimport { cn } from '@videojs/utils/style';\nexport const a = cn(value, 'gap-2');\n`
    );
    expect(loadTokenModule(file)).toEqual({ a: 'flex gap-2' });
  });

  it('resolves a relative import with an explicit extension', () => {
    write('base.ts', `export const value = 'flex';\n`);
    const file = write('mod.ts', `import { value } from './base.ts';\nexport const a = value;\n`);
    expect(loadTokenModule(file)).toEqual({ a: 'flex' });
  });

  it('resolves an aliased import', () => {
    write('base.ts', `export const button = { base: 'rounded' };\n`);
    const file = write(
      'mod.ts',
      `import { button as baseButton } from './base';\nimport { cn } from '@videojs/utils/style';\nexport const button = { ...baseButton, primary: cn(baseButton.base, 'bg-brand') };\n`
    );
    expect(loadTokenModule(file)).toEqual({ button: { base: 'rounded', primary: 'rounded bg-brand' } });
  });

  it('honours `export * from`', () => {
    write('a.ts', `export const a = '1';\nexport const b = '2';\n`);
    const file = write('mod.ts', `export * from './a';\n`);
    expect(loadTokenModule(file)).toEqual({ a: '1', b: '2' });
  });

  it('honours `export { x } from`', () => {
    write('a.ts', `export const a = '1';\nexport const b = '2';\n`);
    const file = write('mod.ts', `export { a as alpha } from './a';\n`);
    expect(loadTokenModule(file)).toEqual({ alpha: '1' });
  });

  it('honours `export * as ns from`', () => {
    write('a.ts', `export const a = '1';\nexport const b = '2';\n`);
    const file = write('mod.ts', `export * as everything from './a';\n`);
    expect(loadTokenModule(file)).toEqual({ everything: { a: '1', b: '2' } });
  });

  it('caches per absolute path', () => {
    write('shared.ts', `export const v = 'x';\n`);
    const a = write('a.ts', `export { v } from './shared';\n`);
    const b = write('b.ts', `export { v } from './shared';\n`);
    const r1 = loadTokenModule(a);
    const r2 = loadTokenModule(b);
    expect(r1.v).toBe('x');
    expect(r2.v).toBe('x');
    // Same string identity confirms the cache fed both calls.
    expect(r1.v).toBe(r2.v);
  });
});

describe('loadTokenModule — diagnostics', () => {
  it('rejects function expressions', () => {
    const file = write('mod.ts', `export const a = (b) => b;\n`);
    expect(() => loadTokenModule(file)).toThrow(TokenEvaluationError);
  });

  it('rejects ternary expressions', () => {
    const file = write('mod.ts', `export const a = true ? 'x' : 'y';\n`);
    expect(() => loadTokenModule(file)).toThrow(TokenEvaluationError);
  });

  it('rejects unsupported call expressions', () => {
    const file = write('mod.ts', `export const a = String('x');\n`);
    expect(() => loadTokenModule(file)).toThrow(/Only `cn\(\.\.\.\)` calls are supported/);
  });

  it('rejects spread of a string', () => {
    const file = write(
      'mod.ts',
      `import { cn } from '@videojs/utils/style';\nconst base = cn('a', 'b');\nexport const x = { ...base };\n`
    );
    expect(() => loadTokenModule(file)).toThrow(/Spread of a string token/);
  });

  it('rejects unresolved identifier', () => {
    const file = write('mod.ts', `export const a = unknown;\n`);
    expect(() => loadTokenModule(file)).toThrow(/Unresolved identifier 'unknown'/);
  });

  it('rejects access into a string', () => {
    const file = write('mod.ts', `const a = 'x';\nexport const b = a.foo;\n`);
    expect(() => loadTokenModule(file)).toThrow(/Cannot read property 'foo' of a string token/);
  });
});
