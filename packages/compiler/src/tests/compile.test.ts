import { describe, expect, it } from 'vitest';
import { compile, type ReactTargetOptions, react } from '..';
import { parse } from '../ast';
import { anyTag, byTag, hasChild } from '../matchers';
import { addProp, childAsProp, replace, wrap } from '../react';

/**
 * The TS printer emits `<A />` (space before slash) — collapse all whitespace
 * so test substrings can ignore that detail and focus on structure.
 */
const collapse = (s: string): string => s.replace(/\s+/g, '');

const compileReact = (source: string, options: ReactTargetOptions = {}) =>
  compile(source, { config: { target: react(options) } });

describe('parse', () => {
  it('produces a TSX SourceFile with parent pointers set', () => {
    const { ast } = parse('const x = <Foo/>;');
    expect(ast.statements.length).toBe(1);
    expect(ast.statements[0]!.parent).toBe(ast);
  });
});

describe('compile (no transforms)', () => {
  it('round-trips a simple TSX module', async () => {
    const source = `import { Foo } from 'bar';\nexport function App() { return <Foo/>; }\n`;
    const { code } = await compileReact(source);
    // Identifier and JSX preserved; quote/whitespace style is whatever the printer decides.
    expect(code).toContain('Foo');
    expect(code).toContain('bar');
    expect(collapse(code)).toContain(collapse(`return<Foo/>;`));
  });
});

describe('compile (transformImports — bare-string rule)', () => {
  it('rewrites the module specifier and leaves identifiers untouched', async () => {
    const source = `import { PlayIcon } from '@videojs/icons/components';\nconst _x = PlayIcon;`;
    const { code } = await compileReact(source, {
      imports: { '@videojs/icons/components': '@videojs/icons/react' },
    });
    expect(code).toContain(`import { PlayIcon } from "@videojs/icons/react"`);
  });

  it('leaves unrelated imports untouched', async () => {
    const source = `import { Other } from 'unrelated';\nimport { PlayIcon } from '@videojs/icons/components';\nconst _ = [Other, PlayIcon];`;
    const { code } = await compileReact(source, {
      imports: { '@videojs/icons/components': '@videojs/icons/react' },
    });
    expect(code).toMatch(/from ['"]unrelated['"]/);
    expect(code).toContain('PlayIcon');
  });
});

describe('compile (transformImports — function rule)', () => {
  it('rewrites per-identifier source and bucket-merges by resolved target', async () => {
    const source = `import { PlayButton, MuteButton } from '@videojs/core/components';\nconst _ = [PlayButton, MuteButton];`;
    const { code } = await compileReact(source, {
      imports: {
        '@videojs/core/components': (name) => ({ source: `./ui/${name.toLowerCase()}`, name }),
      },
    });
    expect(code).toContain(`import { PlayButton } from "./ui/playbutton"`);
    expect(code).toContain(`import { MuteButton } from "./ui/mutebutton"`);
  });

  it('renames identifiers when the rule returns a different `name`', async () => {
    const source = `import { OldName } from 'src';\nconst _ = OldName;`;
    const { code } = await compileReact(source, {
      imports: { src: (_name) => ({ source: 'dst', name: 'NewName' }) },
    });
    expect(code).toContain(`import { NewName as OldName } from "dst"`);
  });
});

describe('replace', () => {
  it('substitutes a matched element with a new tag and adds the import', async () => {
    const source = `function App(){ return <Old foo="bar"/>; }`;
    const { code } = await compileReact(source, {
      transforms: [replace({ match: byTag('Old'), with: { source: 'pkg', name: 'New' } })],
    });
    expect(code).toContain(`<New foo="bar"`);
    expect(code).toContain(`import { New } from "pkg"`);
  });

  it('preserves children when matching an open element', async () => {
    const source = `function App(){ return <Old><span/></Old>; }`;
    const { code } = await compileReact(source, {
      transforms: [replace({ match: byTag('Old'), with: { source: 'pkg', name: 'New' } })],
    });
    expect(collapse(code)).toContain(collapse(`<New><span/></New>`));
  });
});

describe('wrap', () => {
  it('wraps a matched element with a new tag and adds the import', async () => {
    const source = `function App(){ return <Inner/>; }`;
    const { code } = await compileReact(source, {
      transforms: [wrap({ match: byTag('Inner'), with: { source: 'pkg', name: 'Outer' } })],
    });
    expect(collapse(code)).toContain(collapse(`<Outer><Inner/></Outer>`));
    expect(code).toContain(`import { Outer } from "pkg"`);
  });
});

describe('childAsProp', () => {
  it('lifts a single JSX-element child into the named prop', async () => {
    const source = `function App(){ return <T><B/></T>; }`;
    const { code } = await compileReact(source, {
      transforms: [childAsProp({ match: byTag('T'), prop: 'render' })],
    });
    expect(collapse(code)).toContain(collapse(`<T render={<B/>}/>`));
  });

  it('skips when prop is already set', async () => {
    const source = `function App(){ return <T render={<X/>}><B/></T>; }`;
    const { code } = await compileReact(source, {
      transforms: [childAsProp({ match: byTag('T'), prop: 'render' })],
    });
    expect(collapse(code)).toContain(collapse(`<X/>`));
    expect(collapse(code)).toContain(collapse(`<B/>`));
  });

  it('skips when there are multiple JSX-element children', async () => {
    const source = `function App(){ return <T><A/><B/></T>; }`;
    const { code } = await compileReact(source, {
      transforms: [childAsProp({ match: byTag('T'), prop: 'render' })],
    });
    expect(collapse(code)).toContain(collapse(`<T><A/><B/></T>`));
  });

  it('matches an array of tags via anyTag', async () => {
    const source = `function App(){ return <><T1><A/></T1><T2><B/></T2></>; }`;
    const { code } = await compileReact(source, {
      transforms: [childAsProp({ match: anyTag(['T1', 'T2']), prop: 'render' })],
    });
    const trimmed = collapse(code);
    expect(trimmed).toContain(collapse(`<T1 render={<A/>}/>`));
    expect(trimmed).toContain(collapse(`<T2 render={<B/>}/>`));
  });
});

describe('addProp', () => {
  it('emits a JSX value by default and adds the import', async () => {
    const source = `function App(){ return <PlayButton/>; }`;
    const { code } = await compileReact(source, {
      transforms: [
        addProp({ match: byTag('PlayButton'), prop: 'render', value: { source: './button', name: 'Button' } }),
      ],
    });
    expect(collapse(code)).toContain(collapse(`<PlayButton render={<Button/>}/>`));
    expect(code).toContain(`import { Button } from "./button"`);
  });

  it('emits a bare reference when kind is "ref"', async () => {
    const source = `function App(){ return <PlayButton/>; }`;
    const { code } = await compileReact(source, {
      transforms: [
        addProp({
          match: byTag('PlayButton'),
          prop: 'as',
          value: { source: './button', name: 'Button', kind: 'ref' },
        }),
      ],
    });
    expect(collapse(code)).toContain(collapse(`<PlayButton as={Button}/>`));
  });

  it('skips elements where the prop is already set', async () => {
    const source = `function App(){ return <PlayButton render={<X/>}/>; }`;
    const { code } = await compileReact(source, {
      transforms: [
        addProp({ match: byTag('PlayButton'), prop: 'render', value: { source: './button', name: 'Button' } }),
      ],
    });
    expect(collapse(code)).toContain(collapse(`<X/>`));
    expect(code).not.toContain('import { Button }');
  });

  it('overwrites the existing prop when overwrite is true', async () => {
    const source = `function App(){ return <PlayButton render={<X/>}/>; }`;
    const { code } = await compileReact(source, {
      transforms: [
        addProp({
          match: byTag('PlayButton'),
          prop: 'render',
          overwrite: true,
          value: { source: './button', name: 'Button' },
        }),
      ],
    });
    expect(collapse(code)).toContain(collapse(`<PlayButton render={<Button/>}/>`));
  });
});

describe('matchers', () => {
  it('byTag supports dotted tags', async () => {
    const source = `function App(){ return <Popover.Root foo="bar"/>; }`;
    const { code } = await compileReact(source, {
      transforms: [replace({ match: byTag('Popover.Root'), with: { source: 'pkg', name: 'NewRoot' } })],
    });
    expect(code).toContain(`<NewRoot`);
  });

  it('byTag honours `when` refinement', async () => {
    const source = `function App(){ return <><Foo a="1"/><Foo a="2"/></>; }`;
    const isA1 = (node: import('../matchers').JsxElementLike) => {
      const attrs = 'attributes' in node ? node.attributes : (node as never);
      const props = (attrs as { properties?: ReadonlyArray<{ initializer?: { text?: string } }> }).properties ?? [];
      return props.some((p) => p.initializer?.text === '1');
    };
    const { code } = await compileReact(source, {
      transforms: [replace({ match: byTag('Foo', { when: isA1 }), with: { source: 'pkg', name: 'Bar' } })],
    });
    expect(code).toContain(`<Bar a="1"`);
    expect(code).toContain(`<Foo a="2"`);
  });

  it('hasChild matches direct children only by default', async () => {
    const source = `function App(){ return <><A><B/></A><A><div><B/></div></A></>; }`;
    const { code } = await compileReact(source, {
      transforms: [replace({ match: byTag('A', { when: hasChild(byTag('B')) }), with: { source: 'p', name: 'Z' } })],
    });
    // First <A> has direct <B/> child → replaced; second <A> has only a nested <B/> → not replaced.
    expect(code).toContain('<Z><B');
    expect(code).toContain('<A><div>');
  });

  it('hasChild with deep:true matches descendants', async () => {
    const source = `function App(){ return <A><div><B/></div></A>; }`;
    const { code } = await compileReact(source, {
      transforms: [
        replace({
          match: byTag('A', { when: hasChild(byTag('B'), { deep: true }) }),
          with: { source: 'p', name: 'Z' },
        }),
      ],
    });
    expect(code).toContain('<Z>');
  });

  it('hasChild composes with byTag for nested shape checks', async () => {
    const source = `function App(){
      return <><Outer><Inner><Target/></Inner></Outer><Outer><Inner><Other/></Inner></Outer></>;
    }`;
    const { code } = await compileReact(source, {
      transforms: [
        replace({
          match: byTag('Outer', { when: hasChild(byTag('Inner', { when: hasChild(byTag('Target')) })) }),
          with: { source: 'p', name: 'Matched' },
        }),
      ],
    });
    // Only the Outer with Inner→Target gets replaced.
    expect(code).toContain('<Matched>');
    expect(code).toContain('<Outer><Inner><Other');
  });
});
