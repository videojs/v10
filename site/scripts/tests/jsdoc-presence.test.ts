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
    expect(flaggedSymbols().sort()).toEqual([
      'ExtendsAddsMembers',
      'GenericAlias',
      'GroupMemberUndocumented',
      'ObjectLiteralAlias',
      'TagOnlySee',
      'TagsOnly',
      'Undocumented',
      'UndocumentedClass',
      'UnionAlias',
      'WithMembers',
    ]);
  });

  // ─── Passing cases ──────────────────────────────────────────────

  it('passes a documented function with a plain summary', () => {
    expect(flaggedSymbols()).not.toContain('Documented');
  });

  it('passes a documented class — undocumented members are NOT checked (Ring 1 only)', () => {
    expect(flaggedSymbols()).not.toContain('DocumentedClass');
  });

  it('passes a JSDoc summary that also carries tags', () => {
    expect(flaggedSymbols()).not.toContain('SummaryWithTags');
  });

  it('passes a documented re-export resolved through a namespace', () => {
    expect(flaggedSymbols()).not.toContain('GroupMemberDocumented');
  });

  // ─── JSDoc shape: tags without prose count as missing ───────────

  it('flags tag-only JSDoc with @deprecated', () => {
    expect(flaggedSymbols()).toContain('TagsOnly');
  });

  it('flags tag-only JSDoc with @see', () => {
    expect(flaggedSymbols()).toContain('TagOnlySee');
  });

  // ─── Leaf-wrapper carve-out ─────────────────────────────────────

  it('skips empty-body extends interface', () => {
    expect(flaggedSymbols()).not.toContain('LeafWrapper');
  });

  it('skips pure type alias (bare reference: type X = Bar)', () => {
    expect(flaggedSymbols()).not.toContain('PureAlias');
  });

  it('skips pure type alias to a qualified name (type X = A.B)', () => {
    expect(flaggedSymbols()).not.toContain('QualifiedAlias');
  });

  it('does NOT skip type alias with type arguments (type X = Bar<Foo>)', () => {
    expect(flaggedSymbols()).toContain('GenericAlias');
  });

  it('does NOT skip union type alias', () => {
    expect(flaggedSymbols()).toContain('UnionAlias');
  });

  it('does NOT skip object-literal type alias', () => {
    expect(flaggedSymbols()).toContain('ObjectLiteralAlias');
  });

  it('does NOT skip interface that extends and adds members', () => {
    expect(flaggedSymbols()).toContain('ExtendsAddsMembers');
  });

  it('flags an undocumented class itself', () => {
    expect(flaggedSymbols()).toContain('UndocumentedClass');
  });

  // ─── @internal carve-out ────────────────────────────────────────

  it('skips @internal-tagged exports', () => {
    expect(flaggedSymbols()).not.toContain('Internal');
  });

  it('skips @internal even when the export also has a summary', () => {
    expect(flaggedSymbols()).not.toContain('InternalWithSummary');
  });

  // ─── Cross-package gate ─────────────────────────────────────────

  it('skips cross-package re-exports declared outside the package src', () => {
    expect(flaggedSymbols()).not.toContain('External');
  });
});
