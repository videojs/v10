import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { compile } from '../../compile';
import { react } from '../../config';
import type { StyleAttributeInfo, StyleAttributeSegmentsInfo, StyleSegment } from '../analyze';
import { analyzeStyles } from '../analyze';

async function collectSegments(source: string): Promise<StyleAttributeInfo[]> {
  const collected: StyleAttributeInfo[] = [];
  await compile(source, {
    config: {
      target: react({
        transforms: [
          analyzeStyles({
            visit: (info) => {
              collected.push(info);
              return undefined;
            },
          }),
        ],
      }),
    },
  });
  return collected;
}

const compileWithTransform = (source: string, transform: ReturnType<typeof analyzeStyles>) =>
  compile(source, { config: { target: react({ transforms: [transform] }) } });

const collapse = (s: string): string => s.replace(/\s+/g, '');

function expectSegments(info: StyleAttributeInfo): asserts info is StyleAttributeSegmentsInfo {
  expect(info.kind).toBe('segments');
  if (info.kind !== 'segments') throw new Error('Expected segmented style attribute info');
}

describe('analyzeStyles — decomposition', () => {
  it('classifies a literal-string className', async () => {
    const infos = await collectSegments(`function App(){ return <div className="foo bar"/>; }`);
    expect(infos).toHaveLength(1);
    const info = infos[0]!;
    expectSegments(info);
    expect(info.segments).toEqual([{ kind: 'literal', value: 'foo bar', node: expect.any(Object) }]);
  });

  it('classifies an expression-wrapped string literal', async () => {
    const infos = await collectSegments(`function App(){ return <div className={'foo'}/>; }`);
    expect(infos).toHaveLength(1);
    const info = infos[0]!;
    expectSegments(info);
    expect(info.segments[0]).toMatchObject({ kind: 'literal', value: 'foo' });
  });

  it('classifies a single dotted token reference', async () => {
    const infos = await collectSegments(`function App(){ return <div className={styles.button.icon}/>; }`);
    expect(infos).toHaveLength(1);
    const info = infos[0]!;
    expectSegments(info);
    expect(info.segments).toHaveLength(1);
    expect(info.segments[0]).toMatchObject({ kind: 'token', path: ['styles', 'button', 'icon'] });
  });

  it('decomposes a `cn(...)` call into mixed segments', async () => {
    const source = `function App(){
      return <div className={cn('flex', styles.button.base, foo())}/>;
    }`;
    const infos = await collectSegments(source);
    expect(infos).toHaveLength(1);
    const info = infos[0]!;
    expectSegments(info);
    const kinds = info.segments.map((s: StyleSegment) => s.kind);
    expect(kinds).toEqual(['literal', 'token', 'opaque']);
    expect(info.segments[1]).toMatchObject({ kind: 'token', path: ['styles', 'button', 'base'] });
  });

  it('marks anything else as opaque', async () => {
    const infos = await collectSegments(`function App(){ return <div className={isOn ? 'a' : 'b'}/>; }`);
    expect(infos).toHaveLength(1);
    expect(infos[0]!.kind).toBe('opaque');
    expect('segments' in infos[0]!).toBe(false);
  });

  it('sees className on self-closing elements', async () => {
    const infos = await collectSegments(`function App(){ return <span className="foo"/>; }`);
    expect(infos).toHaveLength(1);
  });

  it('walks nested elements', async () => {
    const source = `function App(){
      return <div className="a"><span className="b"/><Inner className={cn('c')}/></div>;
    }`;
    const infos = await collectSegments(source);
    expect(infos).toHaveLength(3);
  });

  it('skips elements without className', async () => {
    const source = `function App(){
      return <div><span className="b"/></div>;
    }`;
    const infos = await collectSegments(source);
    expect(infos).toHaveLength(1);
    const info = infos[0]!;
    expectSegments(info);
    expect(info.segments[0]).toMatchObject({ value: 'b' });
  });

  it('honours custom mergeFn name', async () => {
    const source = `function App(){ return <div className={twMerge('a', 'b')}/>; }`;
    const infos: StyleAttributeInfo[] = [];
    await compile(source, {
      config: {
        target: react({
          transforms: [
            analyzeStyles({
              mergeFn: 'twMerge',
              visit: (info) => {
                infos.push(info);
                return undefined;
              },
            }),
          ],
        }),
      },
    });
    const info = infos[0]!;
    expectSegments(info);
    expect(info.segments).toHaveLength(2);
  });
});

describe('analyzeStyles — rewriting', () => {
  it('replaces the className value when the visitor returns an expression', async () => {
    const source = `function App(){ return <div className="foo bar"/>; }`;
    const { code } = await compileWithTransform(
      source,
      analyzeStyles({
        visit: (_, factory) => factory.createStringLiteral('rewritten'),
      })
    );
    expect(code).toMatch(/className="rewritten"/);
    expect(code).not.toContain('foo bar');
  });

  it('leaves the className alone when the visitor returns undefined', async () => {
    const source = `function App(){ return <div className="foo"/>; }`;
    const { code } = await compileWithTransform(source, analyzeStyles({ visit: () => undefined }));
    expect(code).toContain('"foo"');
  });

  it('rewrites a self-closing element', async () => {
    const source = `function App(){ return <span className="foo"/>; }`;
    const { code } = await compileWithTransform(
      source,
      analyzeStyles({
        visit: (_, factory) => factory.createStringLiteral('bar'),
      })
    );
    expect(collapse(code)).toContain(collapse(`<span className="bar"/>`));
  });

  it('only rewrites elements the visitor opts to change', async () => {
    const source = `function App(){
      return <div className="keep"><span className="rewrite"/></div>;
    }`;
    const { code } = await compileWithTransform(
      source,
      analyzeStyles({
        visit: (info, factory) => {
          const hasRewrite =
            info.kind === 'segments' && info.segments.some((s) => s.kind === 'literal' && s.value === 'rewrite');
          return hasRewrite ? factory.createStringLiteral('rewritten') : undefined;
        },
      })
    );
    expect(code).toContain('"keep"');
    expect(code).toContain('"rewritten"');
    expect(code).not.toContain('"rewrite"');
  });

  it('passes a NodeFactory the visitor can use to build any expression', async () => {
    const source = `function App(){ return <div className="foo"/>; }`;
    const { code } = await compileWithTransform(
      source,
      analyzeStyles({
        visit: (_, factory) =>
          factory.createCallExpression(factory.createIdentifier('cn'), undefined, [
            factory.createStringLiteral('a'),
            factory.createStringLiteral('b'),
          ]),
      })
    );
    expect(code).toMatch(/className=\{cn\("a",\s*"b"\)\}/);
  });
});

describe('analyzeStyles — element identity', () => {
  it('exposes the element on the StyleAttributeInfo so visitors can reason about its tag', async () => {
    const source = `function App(){ return <PlayButton className="foo"/>; }`;
    const tags: string[] = [];
    await compileWithTransform(
      source,
      analyzeStyles({
        visit: (info) => {
          const tag = ts.isJsxElement(info.element) ? info.element.openingElement.tagName : info.element.tagName;
          if (ts.isIdentifier(tag)) tags.push(tag.text);
          return undefined;
        },
      })
    );
    expect(tags).toEqual(['PlayButton']);
  });
});
