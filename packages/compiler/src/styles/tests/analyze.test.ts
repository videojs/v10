import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { compile } from '../../compile';
import type { StyleAttributeInfo, StyleSegment } from '../analyze';
import { analyzeStyles } from '../analyze';

function collectSegments(source: string): StyleAttributeInfo[] {
  const collected: StyleAttributeInfo[] = [];
  compile(source, {
    target: 'react',
    plugins: [
      analyzeStyles({
        visit: (info) => {
          collected.push(info);
          return undefined;
        },
      }),
    ],
  });
  return collected;
}

const collapse = (s: string): string => s.replace(/\s+/g, '');

describe('analyzeStyles — decomposition', () => {
  it('classifies a literal-string className', () => {
    const infos = collectSegments(`function App(){ return <div className="foo bar"/>; }`);
    expect(infos).toHaveLength(1);
    expect(infos[0]!.kind).toBe('segments');
    expect(infos[0]!.segments).toEqual([{ kind: 'literal', value: 'foo bar', node: expect.any(Object) }]);
  });

  it('classifies an expression-wrapped string literal', () => {
    const infos = collectSegments(`function App(){ return <div className={'foo'}/>; }`);
    expect(infos).toHaveLength(1);
    expect(infos[0]!.segments?.[0]).toMatchObject({ kind: 'literal', value: 'foo' });
  });

  it('classifies a single dotted token reference', () => {
    const infos = collectSegments(`function App(){ return <div className={styles.button.icon}/>; }`);
    expect(infos).toHaveLength(1);
    expect(infos[0]!.segments).toHaveLength(1);
    expect(infos[0]!.segments?.[0]).toMatchObject({ kind: 'token', path: ['styles', 'button', 'icon'] });
  });

  it('decomposes a `cn(...)` call into mixed segments', () => {
    const source = `function App(){
      return <div className={cn('flex', styles.button.base, foo())}/>;
    }`;
    const infos = collectSegments(source);
    expect(infos).toHaveLength(1);
    expect(infos[0]!.kind).toBe('segments');
    const kinds = infos[0]!.segments?.map((s: StyleSegment) => s.kind);
    expect(kinds).toEqual(['literal', 'token', 'opaque']);
    expect(infos[0]!.segments?.[1]).toMatchObject({ kind: 'token', path: ['styles', 'button', 'base'] });
  });

  it('marks anything else as opaque', () => {
    const infos = collectSegments(`function App(){ return <div className={isOn ? 'a' : 'b'}/>; }`);
    expect(infos).toHaveLength(1);
    expect(infos[0]!.kind).toBe('opaque');
    expect(infos[0]!.segments).toBeUndefined();
  });

  it('sees className on self-closing elements', () => {
    const infos = collectSegments(`function App(){ return <span className="foo"/>; }`);
    expect(infos).toHaveLength(1);
  });

  it('walks nested elements', () => {
    const source = `function App(){
      return <div className="a"><span className="b"/><Inner className={cn('c')}/></div>;
    }`;
    const infos = collectSegments(source);
    expect(infos).toHaveLength(3);
  });

  it('skips elements without className', () => {
    const source = `function App(){
      return <div><span className="b"/></div>;
    }`;
    const infos = collectSegments(source);
    expect(infos).toHaveLength(1);
    expect(infos[0]!.segments?.[0]).toMatchObject({ value: 'b' });
  });

  it('honours custom mergeFn name', () => {
    const source = `function App(){ return <div className={twMerge('a', 'b')}/>; }`;
    const infos: StyleAttributeInfo[] = [];
    compile(source, {
      target: 'react',
      plugins: [
        analyzeStyles({
          mergeFn: 'twMerge',
          visit: (info) => {
            infos.push(info);
            return undefined;
          },
        }),
      ],
    });
    expect(infos[0]!.kind).toBe('segments');
    expect(infos[0]!.segments).toHaveLength(2);
  });
});

describe('analyzeStyles — rewriting', () => {
  it('replaces the className value when the visitor returns an expression', () => {
    const source = `function App(){ return <div className="foo bar"/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [
        analyzeStyles({
          visit: (_, factory) => factory.createStringLiteral('rewritten'),
        }),
      ],
    });
    expect(code).toMatch(/className="rewritten"/);
    expect(code).not.toContain('foo bar');
  });

  it('leaves the className alone when the visitor returns undefined', () => {
    const source = `function App(){ return <div className="foo"/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [analyzeStyles({ visit: () => undefined })],
    });
    expect(code).toContain('"foo"');
  });

  it('rewrites a self-closing element', () => {
    const source = `function App(){ return <span className="foo"/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [
        analyzeStyles({
          visit: (_, factory) => factory.createStringLiteral('bar'),
        }),
      ],
    });
    expect(collapse(code)).toContain(collapse(`<span className="bar"/>`));
  });

  it('only rewrites elements the visitor opts to change', () => {
    const source = `function App(){
      return <div className="keep"><span className="rewrite"/></div>;
    }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [
        analyzeStyles({
          visit: (info, factory) => {
            const hasRewrite = info.segments?.some((s) => s.kind === 'literal' && s.value === 'rewrite');
            return hasRewrite ? factory.createStringLiteral('rewritten') : undefined;
          },
        }),
      ],
    });
    expect(code).toContain('"keep"');
    expect(code).toContain('"rewritten"');
    expect(code).not.toContain('"rewrite"');
  });

  it('passes a NodeFactory the visitor can use to build any expression', () => {
    const source = `function App(){ return <div className="foo"/>; }`;
    const { code } = compile(source, {
      target: 'react',
      plugins: [
        analyzeStyles({
          visit: (_, factory) =>
            factory.createCallExpression(factory.createIdentifier('cn'), undefined, [
              factory.createStringLiteral('a'),
              factory.createStringLiteral('b'),
            ]),
        }),
      ],
    });
    expect(code).toMatch(/className=\{cn\("a",\s*"b"\)\}/);
  });
});

describe('analyzeStyles — element identity', () => {
  it('exposes the element on the StyleAttributeInfo so visitors can reason about its tag', () => {
    const source = `function App(){ return <PlayButton className="foo"/>; }`;
    const tags: string[] = [];
    compile(source, {
      target: 'react',
      plugins: [
        analyzeStyles({
          visit: (info) => {
            const tag = ts.isJsxElement(info.element) ? info.element.openingElement.tagName : info.element.tagName;
            if (ts.isIdentifier(tag)) tags.push(tag.text);
            return undefined;
          },
        }),
      ],
    });
    expect(tags).toEqual(['PlayButton']);
  });
});
