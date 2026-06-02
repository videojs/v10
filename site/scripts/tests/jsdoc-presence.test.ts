import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectPackageViolations } from '../jsdoc-presence/check.js';

const pkgA = path.resolve(import.meta.dirname, 'fixtures/jsdoc-presence/monorepo/packages/pkg-a');

function flaggedSymbols(): string[] {
  return collectPackageViolations({
    packageName: 'pkg-a',
    packageRoot: pkgA,
    entryFiles: [path.join(pkgA, 'src/index.ts')],
    tsconfigPath: path.join(pkgA, 'tsconfig.json'),
  }).map((v) => v.symbol);
}

describe('collectPackageViolations', () => {
  it('flags exactly the undocumented public exports', () => {
    expect(flaggedSymbols().sort()).toEqual(['GroupMemberUndocumented', 'TagsOnly', 'Undocumented', 'WithMembers']);
  });

  it('passes documented exports and documented re-exports', () => {
    const names = flaggedSymbols();
    expect(names).not.toContain('Documented');
    expect(names).not.toContain('GroupMemberDocumented');
  });

  it('skips leaf-wrapper interfaces and pure type aliases', () => {
    const names = flaggedSymbols();
    expect(names).not.toContain('LeafWrapper');
    expect(names).not.toContain('PureAlias');
  });

  it('skips @internal exports', () => {
    expect(flaggedSymbols()).not.toContain('Internal');
  });

  it('flags JSDoc that has only tags (no prose summary)', () => {
    expect(flaggedSymbols()).toContain('TagsOnly');
  });

  it('skips cross-package re-exports declared outside the package src', () => {
    expect(flaggedSymbols()).not.toContain('External');
  });
});
