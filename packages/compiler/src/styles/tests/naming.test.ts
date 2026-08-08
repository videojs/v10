import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { DiagnosticError } from '../../diagnostics';
import type { JsxElementLike } from '../../jsx';
import { parse } from '../../parse';
import type { StyleSegment } from '../analyze';
import { deriveClassName } from '../naming';

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
    expect(r.source).toBe('component');
    expect(r.className).toBe('foo-bar');
  });

  it('flattens compound tags', () => {
    const r = deriveClassName({ element: firstElement(`<Outer.Inner/>`) });
    expect(r.className).toBe('outer-inner');
  });
});

describe('deriveClassName — token-path derivation', () => {
  it('derives from a single token segment on a bare HTML element', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={styles.fooBar}/>`),
      segments: [token(['styles', 'fooBar'])],
    });
    expect(r.source).toBe('token');
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
      element: firstElement(`<div className={['flex', styles.foo]}/>`),
      segments: [literal('flex'), token(['styles', 'foo'])],
    });
    expect(r.className).toBe('foo');
  });

  it('uses the last equal-depth token when multiple tokens are present', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={[styles.a, styles.b]}/>`),
      segments: [token(['styles', 'a']), token(['styles', 'b'])],
    });
    expect(r.className).toBe('b');
  });

  it('derives from a token when opaque runtime segments are present', () => {
    const r = deriveClassName({
      element: firstElement(`<div className={[styles.a, foo()]}/>`),
      segments: [token(['styles', 'a']), opaque()],
    });
    expect(r.className).toBe('a');
  });

  it('keeps regular components tag-derived when token segments are present', () => {
    const r = deriveClassName({
      element: firstElement(`<PlayButton className={styles.button.icon}/>`),
      segments: [token(['styles', 'button', 'icon'])],
    });
    expect(r.source).toBe('component');
    expect(r.className).toBe('play-button');
  });

  it('derives regular components from known token roots', () => {
    const r = deriveClassName({
      element: firstElement(`<ChevronIcon className={menu.chevron}/>`),
      segments: [token(['menu', 'chevron'])],
      tokenRoots: new Set(['menu']),
      tokenNamespaces: new Set(),
    });
    expect(r.source).toBe('token');
    expect(r.className).toBe('menu-chevron');
  });

  it('derives compound components from token segments when present', () => {
    const r = deriveClassName({
      element: firstElement(`<Menu.Trigger className={styles.menu.item}/>`),
      segments: [token(['styles', 'menu', 'item'])],
    });
    expect(r.source).toBe('token');
    expect(r.className).toBe('menu-item');
  });
});

describe('deriveClassName — resolveName', () => {
  it('default is identity (returns defaultName as the class)', () => {
    const r = deriveClassName({ element: firstElement(`<FooBar/>`) });
    expect(r.className).toBe('foo-bar');
  });

  it('lets the consumer reshape the name (e.g. add a prefix)', () => {
    const r = deriveClassName({
      element: firstElement(`<FooBar/>`),
      resolveName: (ctx) => `app-${ctx.defaultName}`,
    });
    expect(r.className).toBe('app-foo-bar');
  });

  it('lets the consumer drop a tail segment by inspecting the original tag', () => {
    const r = deriveClassName({
      element: firstElement(`<Foo.Root/>`),
      resolveName: (ctx) => {
        if (ctx.source === 'component' && ctx.tag.endsWith('.Root')) {
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
      resolveName: (ctx) => {
        if (ctx.source === 'token' && ctx.tokenPath?.at(-1) === 'root') {
          return ctx.defaultName.replace(/-root$/, '');
        }
        return ctx.defaultName;
      },
    });
    expect(r.className).toBe('foo');
  });

  it('can choose a token name for a regular component', () => {
    const r = deriveClassName({
      element: firstElement(`<PlayButton className={styles.button.icon}/>`),
      segments: [token(['styles', 'button', 'icon'])],
      resolveName: (ctx) => ctx.tokenName ?? ctx.defaultName,
    });
    expect(r.className).toBe('button-icon');
    expect(r.source).toBe('resolved');
  });

  it('can choose a component name when a known token root would be the default', () => {
    const r = deriveClassName({
      element: firstElement(`<ChevronIcon className={menu.chevron}/>`),
      segments: [token(['menu', 'chevron'])],
      tokenRoots: new Set(['menu']),
      tokenNamespaces: new Set(),
      resolveName: (ctx) => ctx.componentName ?? ctx.defaultName,
    });
    expect(r.className).toBe('chevron-icon');
    expect(r.source).toBe('resolved');
  });

  it('resolveName receives source = "component" for component defaults', () => {
    let receivedSource: string | undefined;
    deriveClassName({
      element: firstElement(`<FooBar/>`),
      resolveName: (ctx) => {
        receivedSource = ctx.source;
        return ctx.defaultName;
      },
    });
    expect(receivedSource).toBe('component');
  });

  it('resolveName receives source = "token" for token defaults', () => {
    let receivedSource: string | undefined;
    deriveClassName({
      element: firstElement(`<div className={styles.foo}/>`),
      segments: [token(['styles', 'foo'])],
      resolveName: (ctx) => {
        receivedSource = ctx.source;
        return ctx.defaultName;
      },
    });
    expect(receivedSource).toBe('token');
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
