import { describe, expect, it } from 'vitest';
import { collectModuleSpecifiers, rewriteModuleSpecifiers } from '../module-specifiers';

describe('rewriteModuleSpecifiers', () => {
  it('rewrites static, exported, and dynamic module specifiers structurally', () => {
    const source = `
import value from './value';
export { helper } from './helper';
const lazy = import('./lazy');
const text = "import('./text')";
// import comment from './comment';
`;

    const output = rewriteModuleSpecifiers(source, {
      filename: 'fixture.ts',
      resolve: (specifier) => (specifier.startsWith('.') ? `../generated/${specifier.slice(2)}` : specifier),
    });

    expect(output).toContain('from "../generated/value"');
    expect(output).toContain('from "../generated/helper"');
    expect(output).toContain('import("../generated/lazy")');
    expect(output).toContain('"import(\'./text\')"');
    expect(output).toContain("// import comment from './comment';");
  });
});

describe('collectModuleSpecifiers', () => {
  it('ignores import-like text in strings and comments', () => {
    const source = `
import value from '@scope/value';
export { helper } from './helper';
const lazy = import('lazy-package/feature');
const text = "from 'not-a-package'";
// import comment from 'also-not-a-package';
`;

    expect(collectModuleSpecifiers(source, 'fixture.ts')).toEqual(['@scope/value', './helper', 'lazy-package/feature']);
  });
});
