import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import type { JsxElementLike } from '../../matchers';
import { parse } from '../../parse';
import type { StyleSegment } from '../../styles';
import { DiagnosticError, deriveClassName } from '../naming';

/** Parse a tiny TSX snippet and return its first JsxElement / JsxSelfClosingElement. */
function firstElement(source: string): JsxElementLike {
  const { ast } = parse(`function App(){ return ${source}; }`);
  let found: JsxElementLike | null = null;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(ast, visit);
  if (!found) throw new Error(`No JSX element in: ${source}`);
  return found;
}

const literal = (value: string): StyleSegment => ({
  kind: 'literal',
  value,
  node: null as never,
});

const token = (path: readonly string[]): StyleSegment => ({
  kind: 'token',
  path,
  node: null as never,
});

const opaque = (): StyleSegment => ({ kind: 'opaque', node: null as never });

describe('deriveClassName — tag derivation', () => {
  it('kebab-cases a simple component tag', () => {
    const r = deriveClassName({ element: firstElement(`<FooBar/>`) });
    expect(r.source).toBe('tag');
    expect(r.className).toBe('foo-bar');
  });

  it('flattens compound tags', () => {
    const r = deriveClassName({ element: firstElement(`<Outer.Inner/>`) });
    expect(r.className).toBe('outer-inner');
  });

  it('honours overrides keyed by tag', () => {
    const r = deriveClassName({
      element: firstElement(`<XYZWidget/>`),
      overrides: { XYZWidget: 'xyz-widget' },
    });
    expect(r.source).toBe('override');
    expect(r.className).toBe('xyz-widget');
  });
});

describe('deriveClassName — token-path derivation', () => {
  it('derives from a single token segment on a bare HTML element', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={styles.fooBar}/>`),
      segments: [token(['styles', 'fooBar'])],
    });
    expect(r.source).toBe('token-path');
    expect(r.className).toBe('foo-bar');
  });

  it('extends the path for multi-segment tails', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={styles.fooBar.inner}/>`),
      segments: [token(['styles', 'fooBar', 'inner'])],
    });
    expect(r.className).toBe('foo-bar-inner');
  });

  it('drops the leading namespace identifier', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={tokens.foo}/>`),
      segments: [token(['tokens', 'foo'])],
    });
    expect(r.className).toBe('foo');
  });

  it('drops leading identifiers that are known token namespaces', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={styles.foo}/>`),
      segments: [token(['styles', 'foo'])],
      tokenNamespaces: new Set(['styles']),
    });
    expect(r.className).toBe('foo');
  });

  it('keeps leading identifiers that are named token imports', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={slider.root}/>`),
      segments: [token(['slider', 'root'])],
      tokenNamespaces: new Set(),
    });
    expect(r.className).toBe('slider-root');
  });

  it('combines literal segments with a single token (token names the class)', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={cn('flex', styles.foo)}/>`),
      segments: [literal('flex'), token(['styles', 'foo'])],
    });
    expect(r.className).toBe('foo');
  });

  it('uses the last equal-depth token when multiple tokens are present', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={cn(styles.a, styles.b)}/>`),
      segments: [token(['styles', 'a']), token(['styles', 'b'])],
    });
    expect(r.className).toBe('b');
  });

  it('derives from a token when opaque runtime segments are present', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={cn(styles.a, foo())}/>`),
      segments: [token(['styles', 'a']), opaque()],
    });
    expect(r.className).toBe('a');
  });

  it('honours overrides keyed by dotted token path', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={styles.foo.bar}/>`),
      segments: [token(['styles', 'foo', 'bar'])],
      overrides: { 'styles.foo.bar': 'special' },
    });
    expect(r.source).toBe('override');
    expect(r.className).toBe('special');
  });

  it('keeps regular components tag-derived when token segments are present', () => {
    const r = deriveClassName({
      element: firstElement(`<PlayButton className={styles.button.icon}/>`),
      segments: [token(['styles', 'button', 'icon'])],
    });
    expect(r.source).toBe('tag');
    expect(r.className).toBe('play-button');
  });

  it('derives regular components from known token roots', () => {
    const r = deriveClassName({
      element: firstElement(`<ChevronIcon className={menu.chevron}/>`),
      segments: [token(['menu', 'chevron'])],
      tokenRoots: new Set(['menu']),
      tokenNamespaces: new Set(),
    });
    expect(r.source).toBe('token-path');
    expect(r.className).toBe('menu-chevron');
  });

  it('derives compound components from token segments when present', () => {
    const r = deriveClassName({
      element: firstElement(`<Menu.Trigger className={styles.menu.item}/>`),
      segments: [token(['styles', 'menu', 'item'])],
    });
    expect(r.source).toBe('token-path');
    expect(r.className).toBe('menu-item');
  });
});

describe('deriveClassName — transformName', () => {
  it('default is identity (returns defaultName as the class)', () => {
    const r = deriveClassName({ element: firstElement(`<FooBar/>`) });
    expect(r.className).toBe('foo-bar');
  });

  it('lets the consumer reshape the name (e.g. add a prefix)', () => {
    const r = deriveClassName({
      element: firstElement(`<FooBar/>`),
      transformName: (ctx) => `app-${ctx.defaultName}`,
    });
    expect(r.className).toBe('app-foo-bar');
  });

  it('lets the consumer drop a tail segment by inspecting the original tag', () => {
    const r = deriveClassName({
      element: firstElement(`<Foo.Root/>`),
      transformName: (ctx) => {
        if (ctx.source === 'tag' && ctx.tag.endsWith('.Root')) {
          return ctx.defaultName.replace(/-root$/, '');
        }
        return ctx.defaultName;
      },
    });
    expect(r.className).toBe('foo');
  });

  it('exposes the token path so consumers can branch on token-path source', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={styles.foo.root}/>`),
      segments: [token(['styles', 'foo', 'root'])],
      transformName: (ctx) => {
        if (ctx.source === 'token-path' && ctx.tokenPath.at(-1) === 'root') {
          return ctx.defaultName.replace(/-root$/, '');
        }
        return ctx.defaultName;
      },
    });
    expect(r.className).toBe('foo');
  });

  it('overrides win over transformName', () => {
    const r = deriveClassName({
      element: firstElement(`<FooBar/>`),
      overrides: { FooBar: 'override-wins' },
      transformName: () => 'transform-wins',
    });
    expect(r.className).toBe('override-wins');
    expect(r.source).toBe('override');
  });

  it('transformName receives source = "tag" for tag derivation', () => {
    let receivedSource: string | undefined;
    deriveClassName({
      element: firstElement(`<FooBar/>`),
      transformName: (ctx) => {
        receivedSource = ctx.source;
        return ctx.defaultName;
      },
    });
    expect(receivedSource).toBe('tag');
  });

  it('transformName receives source = "token-path" for token derivation', () => {
    let receivedSource: string | undefined;
    deriveClassName({
      element: firstElement(`<div className={styles.foo}/>`),
      segments: [token(['styles', 'foo'])],
      transformName: (ctx) => {
        receivedSource = ctx.source;
        return ctx.defaultName;
      },
    });
    expect(receivedSource).toBe('token-path');
  });
});

describe('deriveClassName — diagnostics', () => {
  it('throws DiagnosticError for a bare HTML element with no token reference', () => {
    expect(() =>
      deriveClassName({
        element: firstElement(`<div className="foo bar"/>`),
        segments: [literal('foo bar')],
      })
    ).toThrow(DiagnosticError);
  });

  it('throws DiagnosticError when no segments are provided to a bare HTML element', () => {
    expect(() => deriveClassName({ element: firstElement(`<span/>`) })).toThrow(DiagnosticError);
  });

  it('includes the tag name in the error message', () => {
    let caught: DiagnosticError | null = null;
    try {
      deriveClassName({ element: firstElement(`<div className="x y"/>`), segments: [literal('x y')] });
    } catch (e) {
      caught = e as DiagnosticError;
    }
    expect(caught).toBeInstanceOf(DiagnosticError);
    expect(caught!.message).toContain('<div>');
  });
});
