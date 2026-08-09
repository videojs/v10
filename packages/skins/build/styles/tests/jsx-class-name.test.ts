import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { readClassName, rewriteClassName } from '../jsx-class-name';

describe('readClassName', () => {
  it('reads literal and dotted token segments in order', () => {
    const info = read(`<div className={['hook', styles.button, value()]} />`);

    expect(info.kind).toBe('segments');
    if (info.kind !== 'segments') throw new Error('Expected static className segments.');
    expect(info.segments).toMatchObject([
      { kind: 'literal', value: 'hook' },
      { kind: 'token', path: ['styles', 'button'] },
      { kind: 'opaque' },
    ]);
  });

  it('reads string attributes without an expression wrapper', () => {
    const info = read(`<div className="one two" />`);

    expect(info).toMatchObject({ kind: 'segments', segments: [{ kind: 'literal', value: 'one two' }] });
  });

  it('keeps conditionals and array spreads opaque', () => {
    expect(read(`<div className={enabled ? styles.on : styles.off} />`).kind).toBe('opaque');
    expect(read(`<div className={[styles.base, ...extra]} />`).kind).toBe('opaque');
  });
});

describe('rewriteClassName', () => {
  it('rewrites className on paired and self-closing elements', () => {
    expect(rewrite(`<div className={styles.root}></div>`)).toContain('<div className="media-root"></div>');
    expect(rewrite(`<span className={styles.label} />`)).toContain('<span className="media-root"/>');
  });
});

function read(source: string) {
  const sourceFile = ts.createSourceFile('test.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let element: ts.JsxElement | ts.JsxSelfClosingElement | undefined;
  const visit = (node: ts.Node): void => {
    if (!element && (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node))) element = node;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!element) throw new Error('Expected a JSX element.');
  const info = readClassName(element);
  if (!info) throw new Error('Expected a className attribute.');
  return info;
}

function rewrite(source: string): string {
  const info = read(source);
  const element = rewriteClassName(info, ts.factory.createStringLiteral('media-root'), ts.factory);
  return ts.createPrinter().printNode(ts.EmitHint.Unspecified, element, element.getSourceFile());
}
