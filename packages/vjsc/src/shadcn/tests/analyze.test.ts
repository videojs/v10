import { describe, expect, it } from 'vite-plus/test';

import { analyzeImports, replaceImportSpecifiers } from '../analyze';

describe('analyzeImports', () => {
  it('classifies authored module references and preserves their source ranges', () => {
    const source = `
import value from "static";
import type { Model } from './model';
import { type Props, render } from './mixed';
export type { Result } from './result';
export { helper } from './helper';
export const lazy = import(\`./lazy\`);
export type Context = import('./context').Context;
`;

    const references = analyzeImports(source, 'source.ts');

    expect(references.map(({ specifier, kind, quote }) => ({ specifier, kind, quote }))).toEqual([
      { specifier: 'static', kind: 'static', quote: '"' },
      { specifier: './model', kind: 'type', quote: "'" },
      { specifier: './mixed', kind: 'static', quote: "'" },
      { specifier: './result', kind: 'type', quote: "'" },
      { specifier: './helper', kind: 'static', quote: "'" },
      { specifier: './lazy', kind: 'dynamic', quote: '`' },
      { specifier: './context', kind: 'type', quote: "'" },
    ]);

    for (const reference of references) {
      expect(source.slice(reference.start + 1, reference.end - 1)).toBe(reference.specifier);
    }
  });
});

describe('replaceImportSpecifiers', () => {
  it('changes only selected specifiers without formatting source', () => {
    const source = `import value from './value';\nconst lazy = import("./lazy");\n`;
    const [value, lazy] = analyzeImports(source, 'source.ts');
    const output = replaceImportSpecifiers(source, [
      { ...value!, replacement: '@/value' },
      { ...lazy!, replacement: './installed/lazy' },
    ]);

    expect(output).toBe(`import value from '@/value';\nconst lazy = import("./installed/lazy");\n`);
  });
});
