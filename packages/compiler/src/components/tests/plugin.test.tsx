/** @jsxImportSource ../registry */

import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { html, jsx as target } from '../../config';
import { transform } from '../../transform';
import { defineComponent, defineComponents } from '../definition';
import { plugin } from '../plugin';
import { defineRegistry, defineTarget, extendRegistry, Host, type RegistryPropTransformContext } from '../registry';

const components = defineComponents('@fixture/components', {
  PlayButton: defineComponent({ name: 'PlayButton' }),
  Tooltip: defineComponent({
    name: 'Tooltip',
    root: 'Root',
    parts: {
      Root: defineComponent(),
      Trigger: defineComponent(),
      Popup: defineComponent(),
    },
  }),
});

function fixtureTargets() {
  return {
    PlayButton: fixtureTarget('PlayButton'),
    Tooltip: {
      Root: fixtureTarget('Tooltip', 'Root'),
      Trigger: fixtureTarget('Tooltip', 'Trigger'),
      Popup: fixtureTarget('Tooltip', 'Popup'),
    },
  } as const;
}

function fixtureTarget(component: string, part?: string) {
  return defineTarget({
    import: {
      from: '@fixture/react',
      name: component,
      ...(part ? { path: [part] } : {}),
    },
  });
}

describe('plugin', () => {
  it('rewrites canonical components imported through a namespace', async () => {
    const targets = fixtureTargets();
    const registry = defineRegistry({ components, targets });
    const result = await transform(
      `
        import * as $ from '@fixture/components';

        export const view = <$.PlayButton />;
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('import { PlayButton as PlayButtonPrimitive } from "@fixture/react";');
    expect(result.code).toContain('<PlayButtonPrimitive />');
    expect(result.code).not.toContain('@fixture/components');
  });

  it('lowers component sources added by an extended registry', async () => {
    const skinComponents = defineComponents('@fixture/skin-components', {
      Overlay: defineComponent({ name: 'Overlay' }),
    });
    const registry = extendRegistry(defineRegistry({ components, targets: fixtureTargets() }), {
      components: skinComponents,
      targets: {
        Overlay: defineTarget({ import: { from: '@fixture/react', name: 'Overlay' } }),
      },
    });
    const result = await transform(
      `
        import * as $ from '@fixture/components';
        import { Overlay } from '@fixture/skin-components';

        export const view = <><$.PlayButton /><Overlay /></>;
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('<PlayButtonPrimitive />');
    expect(result.code).toContain('<Overlay />');
    expect(result.code).not.toContain('@fixture/components');
    expect(result.code).not.toContain('@fixture/skin-components');
  });

  it('applies target import rules to registry bindings', async () => {
    const registry = defineRegistry({ components, targets: fixtureTargets() });
    const compilerTarget = target({ imports: { '@fixture/react': '@fixture/preact' } });
    const result = await transform(`import { PlayButton } from '@fixture/components'; <PlayButton />;`, {
      config: {
        target: compilerTarget,
        plugins: [plugin(registry)],
      },
    });

    expect(result.code).toContain('import { PlayButton } from "@fixture/preact";');
    expect(result.code).toContain('<PlayButton />');
  });

  it('lets registries transform target props', async () => {
    const registry = defineRegistry({
      components,
      targets: {
        ...fixtureTargets(),
        PlayButton: defineTarget({
          import: { from: '@fixture/react', name: 'PlayButton' },
        }),
      },
      props: {
        transform: transformFixtureProp,
      },
    });
    const result = await transform(
      `
        import { PlayButton } from '@fixture/components';

        export function View({ className }) {
          return (
            <>
              <PlayButton className={['button', className]} />
              <div className={['layout', className]} />
            </>
          );
        }
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('import { cn, resolveClassName } from "@fixture/style";');
    expect(result.code).toContain("className={state => cn('button', resolveClassName(className, state))}");
    expect(result.code).toContain("className={cn('layout', className)}");
  });

  it('remaps class utility imports through the compiler target', async () => {
    const registry = defineRegistry({
      components,
      targets: fixtureTargets(),
      props: {
        transform: transformFixtureProp,
      },
    });
    const result = await transform(
      `import { PlayButton } from '@fixture/components'; <PlayButton className={['button']} />;`,
      {
        config: {
          target: target({ imports: { '@fixture/style': '@/utils' } }),
          plugins: [plugin(registry)],
        },
      }
    );

    expect(result.code).toContain('import { cn } from "@/utils";');
    expect(result.code).toContain("className={cn('button')}");
  });

  it('allows prop transforms beyond class names', async () => {
    const registry = defineRegistry({
      components,
      targets: fixtureTargets(),
      props: {
        transform({ name, factory }) {
          return name === 'priority' ? factory.createNumericLiteral(2) : undefined;
        },
      },
    });
    const result = await transform(`import { PlayButton } from '@fixture/components'; <PlayButton priority={1} />;`, {
      config: { target: target(), plugins: [plugin(registry)] },
    });

    expect(result.code).toContain('<PlayButton priority={2}/>');
  });

  it('reuses an existing resolved class utility import', async () => {
    const registry = defineRegistry({
      components,
      targets: fixtureTargets(),
      props: {
        transform: transformFixtureProp,
      },
    });
    const result = await transform(
      `
        import { cn } from '@/utils';
        import { PlayButton } from '@fixture/components';

        const existing = cn('layout');
        const button = <PlayButton className={['button']} />;
      `,
      {
        config: {
          target: target({ imports: { '@fixture/style': '@/utils' } }),
          plugins: [plugin(registry)],
        },
      }
    );

    expect(result.code).toContain("import { cn } from '@/utils';");
    expect(result.code).not.toContain('cnPrimitive');
    expect(result.code).toContain("className={cn('button')}");
  });

  it('preserves framework-neutral canonical prop helpers', async () => {
    const registry = defineRegistry({
      components,
      targets: fixtureTargets(),
      types: (name) => (name === 'VjscNode' ? { from: 'react', name: 'ReactNode' } : false),
    });
    const result = await transform(
      `
        import type { PlayButtonProps } from '@fixture/core';
        import * as $ from '@fixture/components';
        import type { Props } from 'vjsc/components';

        export function PlayButton(props: Props<PlayButtonProps>) {
          return <$.PlayButton {...props} />;
        }
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain("import type { PlayButtonProps } from '@fixture/core';");
    expect(result.code).toContain("import type { Props } from 'vjsc/components';");
    expect(result.code).toContain('PlayButton(props: Props<PlayButtonProps>)');
    expect(result.code).toContain('<PlayButtonPrimitive {...props}/>');
  });

  it('projects forwarded canonical props through target metadata', async () => {
    const registry = defineRegistry({
      components,
      targets: {
        ...fixtureTargets(),
        PlayButton: defineTarget({
          import: { from: '@fixture/react', name: 'PlayButton' },
          props: { from: '@fixture/react', name: 'PlayButton', path: ['Props'] },
        }),
      },
    });
    const result = await transform(
      `
        import type { PlayButtonProps as CoreProps } from '@fixture/core';
        import * as $ from '@fixture/components';
        import type { Props } from 'vjsc/components';

        export function PlayButton({ className, ...props }: Props<Omit<CoreProps, 'action'>> = {}) {
          return <$.PlayButton className={className} {...props} />;
        }
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('import { PlayButton as PlayButtonPrimitive } from "@fixture/react";');
    expect(result.code).toContain(
      'export interface PlayButtonProps extends Omit<PlayButtonPrimitive.Props, "children" | "action"> {'
    );
    expect(result.code).toContain('export function PlayButton({ className, ...props }: PlayButtonProps = {})');
    expect(result.code).not.toContain("from 'vjsc/components'");
  });

  it('projects intrinsic target props', async () => {
    const registry = defineRegistry({
      components,
      targets: {
        ...fixtureTargets(),
        PlayButton: defineTarget({
          tagName: 'div',
          props: { from: 'react', name: 'ComponentProps', intrinsic: 'div' },
        }),
      },
    });
    const result = await transform(
      `
        import { PlayButton as Group } from '@fixture/components';
        import type { Props } from 'vjsc/components';

        export function Overlay({ className, ...props }: Props = {}) {
          return <Group className={className} {...props} />;
        }
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('import { type ComponentProps } from "react";');
    expect(result.code).toContain('interface OverlayProps extends Omit<ComponentProps<"div">, "children">');
  });

  it('projects authored children through an explicit target prop', async () => {
    const registry = defineRegistry({
      components,
      targets: {
        ...fixtureTargets(),
        PlayButton: defineTarget({
          import: { from: '@fixture/react', name: 'PlayButton' },
          props: { from: '@fixture/react', name: 'PlayButton', path: ['Props'], children: 'render' },
        }),
      },
      types: (name) => (name === 'VjscNode' ? { from: 'react', name: 'ReactNode' } : false),
    });
    const result = await transform(
      `
        import * as $ from '@fixture/components';
        import type { PropsWithChildren } from 'vjsc/components';

        export function PlayButton({ children, ...props }: PropsWithChildren = {}) {
          return <$.PlayButton render={children} {...props} />;
        }
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain(
      'interface PlayButtonProps extends Omit<PlayButtonPrimitive.Props, "children" | "render">'
    );
    expect(result.code).toContain('children?: PlayButtonPrimitive.Props["render"]');
    expect(result.code).not.toContain('children?: ReactNode');
  });

  it('resolves props exported by another emitted component', async () => {
    const registry = defineRegistry({ components, targets: fixtureTargets() });
    const result = await transform(
      `
        import { ButtonTooltip } from './button-tooltip';
        import type { PropsOf } from 'vjsc/components';

        export interface PlayTooltipProps extends Omit<PropsOf<typeof ButtonTooltip>, 'children'> {}
        export const buttonTooltip = ButtonTooltip;
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain("import { ButtonTooltip, type ButtonTooltipProps } from './button-tooltip';");
    expect(result.code).toContain("extends Omit<ButtonTooltipProps, 'children'>");
    expect(result.code).not.toContain('PropsOf');
  });

  it('rewrites canonical JSX nested in target props', async () => {
    const registry = defineRegistry({ components, targets: fixtureTargets() });
    const result = await transform(
      `
        import * as $ from '@fixture/components';

        export const view = <$.Tooltip.Root render={<$.PlayButton />} />;
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('<TooltipPrimitive.Root render={<PlayButtonPrimitive />}/>');
    expect(result.code).not.toContain('$.');
  });

  it('preserves type imports and adapts React attribute names for HTML', async () => {
    const registry = defineRegistry({
      components,
      targets: {
        ...fixtureTargets(),
        PlayButton: defineTarget({ tagName: 'media-play-button' }),
      },
    });
    const compilerTarget = html();
    const result = await transform(
      `
        import { type PlayButtonProps, PlayButton } from '@fixture/components';

        export type Props = PlayButtonProps;
        export const view = <PlayButton className="button" />;
      `,
      {
        config: {
          target: compilerTarget,
          plugins: [plugin(registry)],
        },
      }
    );

    expect(result.code).toContain("import { type PlayButtonProps } from '@fixture/components';");
    expect(result.code).toContain('<media-play-button class="button"/>');
  });

  it('reports canonical components missing from the registry contract', async () => {
    const registry = defineRegistry({ components, targets: fixtureTargets() });

    await expect(
      transform(`import * as $ from '@fixture/components'; <$.Missing />;`, {
        config: { target: target(), plugins: [plugin(registry)] },
      })
    ).rejects.toThrow('Unknown canonical component <Missing>');
  });

  it('rewrites pass-through hosts and JSX part transforms', async () => {
    const targets = fixtureTargets();
    const registry = defineRegistry({
      components,
      targets: {
        PlayButton: targets.PlayButton,
        Tooltip: {
          parts: {
            Root: targets.Tooltip.Root,
            Trigger: {
              host: targets.Tooltip.Trigger,
              render: ({ props }) => <Host {...props} render={props.children} />,
            },
            Popup: targets.Tooltip.Popup,
          },
        },
      },
    });
    const result = await transform(
      `
        import { PlayButton, Tooltip as TooltipAlias } from '@fixture/components';

        export function Example() {
          return (
            <TooltipAlias.Root open>
              <TooltipAlias.Trigger><PlayButton /></TooltipAlias.Trigger>
              <TooltipAlias.Popup className="popup">Hello</TooltipAlias.Popup>
            </TooltipAlias.Root>
          );
        }
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('import { PlayButton, Tooltip as TooltipAlias } from "@fixture/react";');
    expect(result.code).toContain('<TooltipAlias.Root open>');
    expect(result.code).toContain('<TooltipAlias.Trigger render={<PlayButton />}/>');
    expect(result.code).toContain('<TooltipAlias.Popup className="popup">Hello</TooltipAlias.Popup>');
  });

  it('provides deterministic identifiers scoped to each compound component occurrence', async () => {
    const targets = fixtureTargets();
    const registry = defineRegistry({
      components,
      targets: {
        PlayButton: targets.PlayButton,
        Tooltip: {
          parts: {
            Root: targets.Tooltip.Root,
            Trigger: {
              host: targets.Tooltip.Trigger,
              render: ({ props, id }) => <Host {...props} data-scope={id('shared')} />,
            },
            Popup: {
              host: targets.Tooltip.Popup,
              render: ({ props, id }) => <Host {...props} data-scope={id('shared')} id={id('content')} />,
            },
          },
        },
      },
    });
    const source = `
      import { Tooltip } from '@fixture/components';

      export const view = (
        <>
          <Tooltip.Root><Tooltip.Trigger /><Tooltip.Popup /></Tooltip.Root>
          <Tooltip.Root><Tooltip.Trigger /><Tooltip.Popup /></Tooltip.Root>
        </>
      );
    `;
    const options = {
      filename: '/project/src/view.tsx',
      configDir: '/project',
      config: { target: target(), plugins: [plugin(registry)] },
    } as const;
    const first = await transform(source, options);
    const second = await transform(source, options);
    const scopes = [...first.code.matchAll(/data-scope="([^"]+)"/g)].map((match) => match[1]);
    const content = [...first.code.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);

    expect(first.code).toBe(second.code);
    expect(scopes).toHaveLength(4);
    expect(scopes[0]).toBe(scopes[1]);
    expect(scopes[2]).toBe(scopes[3]);
    expect(scopes[0]).not.toBe(scopes[2]);
    expect(content).toHaveLength(2);
    expect(content[0]).not.toBe(content[1]);
  });

  it('keeps scoped identifiers unique across source modules', async () => {
    const Button = defineTarget({ tagName: 'button' });
    const registry = defineRegistry({
      components,
      targets: {
        ...fixtureTargets(),
        PlayButton: defineTarget<Record<string, unknown>>({
          render: ({ props, id }) => <Button {...props} id={id('root')} />,
        }),
      },
    });
    const source = `import { PlayButton } from '@fixture/components'; <PlayButton />;`;
    const compile = (filename: string) =>
      transform(source, {
        filename,
        configDir: '/project',
        config: { target: target(), plugins: [plugin(registry)] },
      });
    const first = await compile('/project/src/first.tsx');
    const second = await compile('/project/src/second.tsx');
    const firstId = first.code.match(/id="([^"]+)"/)?.[1];
    const secondId = second.code.match(/id="([^"]+)"/)?.[1];

    expect(firstId).toBeDefined();
    expect(secondId).toBeDefined();
    expect(firstId).not.toBe(secondId);
  });

  it('forwards transparent Host props through nested registry components', async () => {
    const wrapperComponents = defineComponents('@fixture/wrappers', {
      Wrapper: defineComponent({ name: 'Wrapper' }),
    });
    const PlayButton = defineTarget({ tagName: 'media-play-button' });
    const TooltipPopup = defineTarget({ tagName: 'media-tooltip' });
    const base = defineRegistry({
      components,
      targets: {
        PlayButton,
        Tooltip: {
          render: ({ root, parts, id }) => (
            <>
              <Host id={id('trigger')}>{parts.Trigger.one().props.children}</Host>
              <TooltipPopup {...root.props} {...parts.Popup.one().props} trigger={id('trigger')} />
            </>
          ),
        },
      },
    });
    const registry = extendRegistry(base, {
      components: wrapperComponents,
      targets: {
        Wrapper: {
          render: ({ props }) => (
            <Host {...props} data-wrapper="">
              {props.children}
            </Host>
          ),
        },
      },
    });
    const result = await transform(
      `
        import { PlayButton, Tooltip } from '@fixture/components';
        import { Wrapper } from '@fixture/wrappers';

        export const view = (
          <Tooltip.Root>
            <Tooltip.Trigger><Wrapper><PlayButton /></Wrapper></Tooltip.Trigger>
            <Tooltip.Popup>Label</Tooltip.Popup>
          </Tooltip.Root>
        );
      `,
      { config: { target: html(), plugins: [plugin(registry)] } }
    );
    const triggerId = result.code.match(/<media-play-button[^>]*id="([^"]+)"/)?.[1];

    expect(triggerId).toBeDefined();
    expect(result.code).toContain(`<media-play-button data-wrapper="" id="${triggerId}"/>`);
    expect(result.code).toContain(`<media-tooltip trigger="${triggerId}"/>`);
  });

  it('forwards Host props to one matching compound-part target', async () => {
    const Button = defineTarget({ tagName: 'button' });
    const Popup = defineTarget({ tagName: 'media-popup' });
    const registry = defineRegistry({
      components,
      targets: {
        PlayButton: fixtureTarget('PlayButton'),
        Tooltip: {
          parts: {
            Root: {
              host: Popup,
              render: ({ props }) => <Host {...props}>{props.children}</Host>,
            },
            Trigger: ({ props }) => <Button {...props}>{props.children}</Button>,
            Popup,
          },
        },
      },
    });
    const result = await transform(
      `
        import { Tooltip } from '@fixture/components';

        <Tooltip.Root open>
          <Tooltip.Trigger>Open</Tooltip.Trigger>
          <Tooltip.Popup>Content</Tooltip.Popup>
        </Tooltip.Root>;
      `,
      { config: { target: html(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('<button>Open</button>');
    expect(result.code).toContain('<media-popup open>Content</media-popup>');
  });

  it('rejects transparent Host output without exactly one concrete child', async () => {
    const wrapperComponents = defineComponents('@fixture/wrappers', {
      Wrapper: defineComponent({ name: 'Wrapper' }),
    });
    const registry = defineRegistry({
      components: wrapperComponents,
      targets: {
        Wrapper: {
          render: ({ props }) => <Host>{props.children}</Host>,
        },
      },
    });
    const compile = (children: string) =>
      transform(`import { Wrapper } from '@fixture/wrappers'; <Wrapper>${children}</Wrapper>;`, {
        config: { target: html(), plugins: [plugin(registry)] },
      });

    await expect(compile('')).rejects.toThrow('exactly one concrete child host, received 0');
    await expect(compile('<div /><span />')).rejects.toThrow('exactly one concrete child host, received 2');
  });

  it('defers transparent Host forwarding for one dynamic HTML child', async () => {
    const wrapperComponents = defineComponents('@fixture/wrappers', {
      Wrapper: defineComponent({ name: 'Wrapper' }),
    });
    const registry = defineRegistry({
      components: wrapperComponents,
      targets: {
        Wrapper: {
          render: ({ props }) => <Host data-wrapper="">{props.children}</Host>,
        },
      },
    });
    const result = await transform(
      `
        import { Wrapper } from '@fixture/wrappers';

        export function Dynamic({ children }) {
          return <Wrapper>{children}</Wrapper>;
        }
      `,
      { config: { target: html(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('import { Host as HtmlHost } from "vjsc/html-runtime/jsx-runtime";');
    expect(result.code).toContain('<HtmlHost data-wrapper="">{children}</HtmlHost>');
  });

  it('supports whole-component JSX and HTML element imports', async () => {
    const PlayButtonElement = defineTarget({
      tagName: 'media-play-button',
      import: { from: '@fixture/html/play-button', sideEffect: true },
    });
    const TooltipElement = defineTarget({
      tagName: 'media-tooltip',
      import: { from: '@fixture/html/tooltip', sideEffect: true },
    });
    const registry = defineRegistry({
      components,
      targets: {
        PlayButton: PlayButtonElement,
        Tooltip: {
          parts: {
            Popup: TooltipElement,
          },
          render: ({ root, parts }) => (
            <TooltipElement {...root.props}>
              {parts.Trigger.one().props.children}
              {parts.Popup.one().props.children}
            </TooltipElement>
          ),
        },
      },
    });
    const result = await transform(
      `
        import { PlayButton, Tooltip } from '@fixture/components';

        export function Example() {
          return (
            <Tooltip.Root open>
              <Tooltip.Trigger><PlayButton /></Tooltip.Trigger>
              <Tooltip.Popup>Hello</Tooltip.Popup>
            </Tooltip.Root>
          );
        }

        export const detachedPopup = <Tooltip.Popup>Detached</Tooltip.Popup>;
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('import "@fixture/html/play-button";');
    expect(result.code).toContain('import "@fixture/html/tooltip";');
    expect(result.code).toContain('<media-tooltip open>');
    expect(result.code).toContain('<media-play-button />');
    expect(result.code).toContain('Hello');
    expect(result.code).toContain('<media-tooltip>Detached</media-tooltip>');
    expect(result.code).not.toContain('Tooltip.Root');
  });

  it('supports leaf components rendered through registry JSX', async () => {
    const Icon = defineTarget({
      tagName: 'media-icon',
      import: { from: '@fixture/html/icon', sideEffect: true },
    });
    const registry = defineRegistry({
      components,
      targets: {
        ...fixtureTargets(),
        PlayButton: defineTarget<Record<string, unknown>>({
          render: ({ props }) => <Icon {...props} name="play" />,
        }),
      },
    });
    const result = await transform(
      `import { PlayButton } from '@fixture/components'; <PlayButton className="button" />;`,
      { config: { target: html(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('import "@fixture/html/icon";');
    expect(result.code).toContain('<media-icon class="button" name="play"/>');
  });

  it('keeps nested instances out of a parent component part collection', async () => {
    const TooltipElement = defineTarget({
      tagName: 'media-tooltip',
      import: { from: '@fixture/html/tooltip', sideEffect: true },
    });
    const registry = defineRegistry({
      components,
      targets: {
        PlayButton: defineTarget({
          tagName: 'media-play-button',
          import: { from: '@fixture/html/play-button', sideEffect: true },
        }),
        Tooltip: {
          render: ({ root, parts }) => (
            <TooltipElement {...root.props}>
              {parts.Trigger.one().props.children}
              {parts.Popup.one().props.children}
            </TooltipElement>
          ),
        },
      },
    });
    const result = await transform(
      `
        import { Tooltip } from '@fixture/components';

        export const nested = (
          <Tooltip.Root>
            <Tooltip.Trigger>Outer</Tooltip.Trigger>
            <Tooltip.Popup>
              <Tooltip.Root>
                <Tooltip.Trigger>Inner</Tooltip.Trigger>
                <Tooltip.Popup>Content</Tooltip.Popup>
              </Tooltip.Root>
            </Tooltip.Popup>
          </Tooltip.Root>
        );
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code.match(/<media-tooltip/g)).toHaveLength(2);
  });

  it('lowers compiler primitives through framework targets', async () => {
    const Div = defineTarget({ tagName: 'div' });
    const Span = defineTarget({ tagName: 'span' });
    const SlotTarget = defineTarget<{ children?: unknown }>({
      render: ({ props }) => props.children,
    });
    const TextTarget = defineTarget<Record<string, unknown>>({
      render: ({ props }) => <Span {...props}>{props.children}</Span>,
    });
    const registry = defineRegistry({
      components,
      targets: fixtureTargets(),
      types: (name) => ({
        from: 'react',
        name: name === 'VjscNode' ? 'ReactNode' : name === 'VjscElement' ? 'ReactElement' : name,
      }),
      primitives: {
        Group: Div,
        Slot: SlotTarget,
        Text: TextTarget,
      },
    });
    const result = await transform(
      `
        import { Group, Slot, Text, type VjscElement, type VjscNode } from 'vjsc/components';

        export const view: VjscNode = <Group><Text className="label">Hello</Text><Slot>{content}</Slot></Group>;
        export const element: VjscElement = <Group />;
        export const empty = <Group><Slot name="poster" /></Group>;
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('<div>');
    expect(result.code).toContain('<span className="label">Hello</span>');
    expect(result.code).toContain('{content}');
    expect(result.code).toContain('empty = <div />');
    expect(result.code).not.toContain('<></>');
    expect(result.code).toContain('import { type ReactElement, type ReactNode } from "react"');
    expect(result.code).toContain('view: ReactNode');
    expect(result.code).toContain('element: ReactElement');
    expect(result.code).not.toContain('vjsc/components');
  });

  it('renders named templates into JSX callback props', async () => {
    const Span = defineTarget({ tagName: 'span' });
    const RenderItem = defineTarget({
      transform: ({ factory, render }) =>
        factory.createArrowFunction(
          undefined,
          undefined,
          ['props', 'item'].map((name) =>
            factory.createParameterDeclaration(undefined, undefined, factory.createIdentifier(name))
          ),
          undefined,
          factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          render({ parameters: ['props', 'item'], spreadProps: 'props' })
        ),
    });
    const Label = defineTarget<Record<string, unknown> & { item: { label: unknown } }>({
      render: ({ props }) => <Span {...props}>{props.item.label}</Span>,
    });
    const registry = defineRegistry({
      components,
      targets: fixtureTargets(),
      primitives: {
        Template: {
          item: {
            render: ({ props }) => <Host renderItem={<RenderItem>{props.children}</RenderItem>} />,
            parts: { label: Label },
          },
        },
      },
    });
    const result = await transform(
      `
        import { Template } from 'vjsc/components';

        export const view = (
          <List>
            <Template name="item">
              <Row><Template.Part name="label" className="label" /></Row>
            </Template>
          </List>
        );
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('renderItem={(props, item) => (<Row {...props}>');
    expect(result.code).toContain('<span className="label">{item.label}</span>');
    expect(result.code).not.toContain('<Template');
    expect(result.code).not.toContain('</List>');
  });

  it('forwards render callback props after authored defaults', async () => {
    const Row = defineTarget({
      transform: ({ factory, render }) =>
        factory.createArrowFunction(
          undefined,
          undefined,
          [factory.createParameterDeclaration(undefined, undefined, 'props')],
          undefined,
          factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          render({ parameters: ['props'], spreadProps: 'props' })
        ),
    });
    const registry = defineRegistry({
      components,
      targets: fixtureTargets(),
      primitives: {
        Template: {
          row: {
            render: ({ props }) => <Host renderItem={<Row>{props.children}</Row>} />,
          },
        },
      },
    });
    const result = await transform(
      `
        import { Template } from 'vjsc/components';

        export const view = (
          <List>
            <Template name="row"><Item disabled /></Template>
          </List>
        );
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('renderItem={props => (<Item disabled {...props}/>)}');
  });
});

function transformFixtureProp({
  name,
  value,
  target: output,
  factory,
  import: requestImport,
}: RegistryPropTransformContext): ts.Expression | undefined {
  if (name !== 'className' || !ts.isArrayLiteralExpression(value)) return undefined;

  const cn = requestImport({ from: '@fixture/style', name: 'cn' });
  const items = [...value.elements];
  const forwarded = items.some((item) => ts.isIdentifier(item) && item.text === 'className');
  const acceptsClassNameCallback = output !== undefined && !('tagName' in output);

  if (!forwarded || !acceptsClassNameCallback) {
    return factory.createCallExpression(cn, undefined, items);
  }

  const resolveClassName = requestImport({ from: '@fixture/style', name: 'resolveClassName' });
  const state = factory.createIdentifier('state');

  return factory.createArrowFunction(
    undefined,
    undefined,
    [factory.createParameterDeclaration(undefined, undefined, state)],
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    factory.createCallExpression(cn, undefined, [
      ...items.filter((item) => !ts.isIdentifier(item) || item.text !== 'className'),
      factory.createCallExpression(resolveClassName, undefined, [factory.createIdentifier('className'), state]),
    ])
  );
}
