import { type Plugin, rolldown } from 'rolldown';
import { describe, expect, it } from 'vite-plus/test';

import { defineComponent, defineSchema } from '../../components/definition';
import { defineComponentTarget } from '../../target/definition';
import { jsx } from '../../target/jsx-runtime';
import { readComponentSource } from '../component-meta';
import { componentSourcePlugin } from '../component-source';
import { type ComponentTargetSelection, componentTargetPlugin } from '../component-target';

const MODULE_ID = '\0fixture.tsx?target=react';

const schema = defineSchema('@fixture/components', {
  PlayButton: defineComponent({ name: 'PlayButton' }),
  Poster: defineComponent<{ src?: string | undefined }>({ name: 'Poster' }),
  Popover: defineComponent({
    name: 'Popover',
    root: 'Root',
    parts: {
      Root: defineComponent<{ open?: boolean | undefined }>(),
      Trigger: defineComponent(),
      Popup: defineComponent<{ placement?: string | undefined }>(),
    },
  }),
  Menu: defineComponent({
    name: 'Menu',
    root: 'Root',
    parts: {
      Root: defineComponent(),
      Trigger: defineComponent(),
      Content: defineComponent(),
    },
  }),
  Slider: defineComponent({
    name: 'Slider',
    root: 'Root',
    parts: {
      Root: defineComponent(),
      Thumbnail: defineComponent({
        parts: {
          Root: defineComponent(),
          Image: defineComponent(),
        },
      }),
    },
  }),
});

const reactTarget = defineComponentTarget<typeof schema>()(({ target, element, imported }) => ({
  source: '@fixture/components',
  resolve: ({ component, part }) =>
    imported({
      from: '@fixture/react',
      name: component,
      ...(part ? { path: part.split('.') } : {}),
    }),
  components: {
    Poster: ({ props, children }) => jsx(target.Poster, { render: children, ...props }),
    Popover: ({ props, parts }) => [
      parts.Trigger.children,
      jsx(target.Popover.Popup, {
        ...props.merge(parts.Popup.props),
        children: parts.Popup.children,
      }),
    ],
    Slider: {
      Thumbnail: {
        Root: element('div'),
      },
    },
  },
  jsx: { importSource: 'react', attributes: 'react' },
}));

const htmlTarget = defineComponentTarget<typeof schema>()(({ target, element }) => {
  const Button = element('button');
  const Svg = element('svg');

  return {
    source: '@fixture/components',
    resolve: ({ component }) =>
      element(`media-${component.toLowerCase()}`, {
        import: { from: '@fixture/elements', sideEffect: true },
      }),
    components: {
      PlayButton: () =>
        jsx(Svg, {
          viewBox: '0 0 18 18',
          preserveAspectRatio: 'xMidYMid meet',
          strokeWidth: 2,
          xlinkHref: '#icon',
        }),
      Menu: {
        Trigger: ({ props, children, id }) => jsx(Button, { commandfor: id('content'), ...props, children }),
        Content: ({ props, children, id }) => jsx(target.Menu.Content, { id: id('content'), ...props, children }),
      },
    },
    jsx: {
      importSource: 'vjsc/html-runtime',
      attributes: 'html',
      host: { from: 'vjsc/html-runtime/jsx-runtime', name: 'Host' },
      scope: { from: 'vjsc/html-runtime/jsx-runtime', name: 'Scope' },
    },
  };
});

describe('componentTargetPlugin', () => {
  it('lowers defaults, structural rules, and source-backed rewrites through Rolldown', async () => {
    const source = await transform(`
      import * as $ from '@fixture/components';

      export function Poster({ src, children }: { src?: string; children?: unknown }) {
        return <$.Poster src={src}>{children}</$.Poster>;
      }

      export const play = <$.PlayButton className="play" />;
      export const thumbnail = <$.Slider.Thumbnail.Root className="thumb" />;
      export const popover = (
        <$.Popover.Root open>
          <$.Popover.Trigger><button>Open</button></$.Popover.Trigger>
          <$.Popover.Popup placement="top"><span>Popup</span></$.Popover.Popup>
        </$.Popover.Root>
      );
    `);

    expect(source).toContain(`Poster as PosterPrimitive, PlayButton, Popover`);
    expect(source).toContain(`from "@fixture/react";`);
    expect(source).toContain('<PosterPrimitive render={children} src={src} />');
    expect(source).toContain('<PlayButton className="play" />');
    expect(source).toContain('<div className="thumb" />');
    expect(source).toContain(
      '<button>Open</button><Popover.Popup open placement="top"><span>Popup</span></Popover.Popup>'
    );
  });

  it('selects targets using the full query-bearing module identity', async () => {
    let selectedId: string | undefined;
    const source = await transform(
      `import { PlayButton } from '@fixture/components'; export const play = <PlayButton />;`,
      {
        targets: (module) => {
          selectedId = module.id;
          return module.parameters.get('target') === 'react' ? [reactTarget] : [];
        },
      }
    );

    expect(selectedId).toBe(MODULE_ID);
    expect(source).toContain('<PlayButtonPrimitive />');
  });

  it('shares runtime-scoped identifiers across parts of one component root', async () => {
    const source = await transform(
      `
        import * as $ from '@fixture/components';
        import type { MenuElement } from '@fixture/elements';
        export const menu = (
          <$.Menu.Root>
            <$.Menu.Trigger>Open</$.Menu.Trigger>
            <$.Menu.Content>Options</$.Menu.Content>
          </$.Menu.Root>
        );
      `,
      { targets: [htmlTarget] }
    );
    const commandFor = /commandfor="([^"]+)"/.exec(source)?.[1];
    const contentId = / id="([^"]+)"/.exec(source)?.[1];

    expect(commandFor).toBeDefined();
    expect(commandFor).toBe(contentId);
    expect(commandFor).toMatch(/^__vjsc-id-/);
    expect(source).toContain('import { Scope } from "vjsc/html-runtime/jsx-runtime";');
    expect(source).toContain('import "@fixture/elements";');
    expect(source).toContain('<Scope prefix=');
  });

  it('preserves SVG attribute spelling in HTML target output', async () => {
    const source = await transform(`import * as $ from '@fixture/components'; export const icon = <$.PlayButton />;`, {
      targets: [htmlTarget],
    });

    expect(source).toContain(
      '<svg viewBox="0 0 18 18" preserveAspectRatio="xMidYMid meet" stroke-width={2} xlink:href="#icon" />'
    );
  });

  it('lowers canonical components retained by an outer rewrite', async () => {
    const source = await transform(`
      import * as $ from '@fixture/components';
      export const poster = <$.Poster><$.PlayButton /></$.Poster>;
    `);

    expect(source).toContain('<Poster render={<PlayButton />} />');
    expect(source).not.toContain('<$.');
  });

  it('keeps fragments when a render prop contains multiple children', async () => {
    const source = await transform(`
      import * as $ from '@fixture/components';
      export const poster = (
        <$.Poster>
          <$.PlayButton />
          <span>Caption</span>
        </$.Poster>
      );
    `);

    expect(source).toContain('<Poster render={<>');
    expect(source).toContain('<PlayButton />');
    expect(source).toContain('<span>Caption</span>');
  });

  it('keeps nested component roots out of the parent part collection', async () => {
    const source = await transform(`
      import * as $ from '@fixture/components';
      export const popover = (
        <$.Popover.Root>
          <$.Popover.Trigger>Outer trigger</$.Popover.Trigger>
          <$.Popover.Popup>
            <$.Popover.Root>
              <$.Popover.Trigger>Inner trigger</$.Popover.Trigger>
              <$.Popover.Popup>Inner popup</$.Popover.Popup>
            </$.Popover.Root>
          </$.Popover.Popup>
        </$.Popover.Root>
      );
    `);

    expect(source.match(/<Popover\.Popup/g)).toHaveLength(2);
    expect(source).toContain('Outer trigger');
    expect(source).toContain('Inner trigger');
    expect(source).not.toContain('<$.');
  });

  it('places generated imports after module directives', async () => {
    const source = await transform(`
      'use client';
      import * as $ from '@fixture/components';
      export const play = <$.PlayButton />;
    `);

    expect(source.indexOf(`'use client'`)).toBeLessThan(source.indexOf('from "@fixture/react"'));
  });
});

async function transform(
  source: string,
  options: { readonly targets?: ComponentTargetSelection } = {}
): Promise<string> {
  let meta: unknown;
  const inspect: Plugin = {
    name: 'fixture:inspect',
    buildEnd() {
      meta = this.getModuleInfo(MODULE_ID)?.meta;
    },
  };
  const bundle = await rolldown({
    input: 'fixture',
    experimental: { nativeMagicString: true },
    external: /^(?:@fixture\/|vjsc\/html-runtime\/)/,
    transform: { jsx: 'preserve' },
    plugins: [
      fixturePlugin(source),
      componentTargetPlugin({ targets: options.targets ?? [reactTarget] }),
      componentSourcePlugin(),
      inspect,
    ],
  });

  await bundle.generate({ format: 'es' });

  const output = readComponentSource(meta);
  if (output === undefined) throw new Error('Fixture build did not retain editable source.');

  return output;
}

function fixturePlugin(source: string): Plugin {
  return {
    name: 'fixture:module',
    resolveId(id) {
      return id === 'fixture' ? MODULE_ID : null;
    },
    load(id) {
      return id === MODULE_ID ? { code: source, moduleType: 'tsx' } : null;
    },
  };
}
