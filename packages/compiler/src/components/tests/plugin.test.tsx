/** @jsxImportSource ../registry */

import { describe, expect, it } from 'vitest';
import { html, jsx as target } from '../../config';
import { transform } from '../../transform';
import { defineComponent, defineComponents } from '../definition';
import { plugin } from '../plugin';
import { defineRegistry, defineTarget, Host } from '../registry';

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
    const registry = defineRegistry(components, targets);
    const result = await transform(
      `
        import * as $ from '@fixture/components';

        export const view = <$.PlayButton />;
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('import { PlayButton as PlayButtonTarget } from "@fixture/react";');
    expect(result.code).toContain('<PlayButtonTarget />');
    expect(result.code).not.toContain('@fixture/components');
  });

  it('applies target import rules to registry bindings', async () => {
    const registry = defineRegistry(components, fixtureTargets());
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

  it('rewrites canonical JSX nested in target props', async () => {
    const registry = defineRegistry(components, fixtureTargets());
    const result = await transform(
      `
        import * as $ from '@fixture/components';

        export const view = <$.Tooltip.Root render={<$.PlayButton />} />;
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('<TooltipTarget.Root render={<PlayButtonTarget />}/>');
    expect(result.code).not.toContain('$.');
  });

  it('preserves type imports and adapts React attribute names for HTML', async () => {
    const registry = defineRegistry(components, {
      ...fixtureTargets(),
      PlayButton: defineTarget({ tagName: 'media-play-button' }),
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
    const registry = defineRegistry(components, fixtureTargets());

    await expect(
      transform(`import * as $ from '@fixture/components'; <$.Missing />;`, {
        config: { target: target(), plugins: [plugin(registry)] },
      })
    ).rejects.toThrow('Unknown canonical component <Missing>');
  });

  it('rewrites pass-through hosts and JSX part transforms', async () => {
    const targets = fixtureTargets();
    const registry = defineRegistry(components, {
      PlayButton: targets.PlayButton,
      Tooltip: {
        host: targets.Tooltip,
        parts: {
          Root: Host,
          Trigger: ({ props }) => <Host {...props} render={props.children} />,
          Popup: Host,
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

  it('supports whole-component JSX and HTML element imports', async () => {
    const PlayButtonElement = defineTarget({
      tagName: 'media-play-button',
      import: { from: '@fixture/html/play-button', sideEffect: true },
    });
    const TooltipElement = defineTarget({
      tagName: 'media-tooltip',
      import: { from: '@fixture/html/tooltip', sideEffect: true },
    });
    const registry = defineRegistry(components, {
      PlayButton: PlayButtonElement,
      Tooltip: {
        render: ({ root, parts }) => (
          <TooltipElement {...root.props}>
            {parts.Trigger.one().props.children}
            {parts.Popup.one().props.children}
          </TooltipElement>
        ),
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
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('import "@fixture/html/play-button";');
    expect(result.code).toContain('import "@fixture/html/tooltip";');
    expect(result.code).toContain('<media-tooltip open>');
    expect(result.code).toContain('<media-play-button />');
    expect(result.code).toContain('Hello');
    expect(result.code).not.toContain('Tooltip.Root');
  });

  it('keeps nested instances out of a parent component part collection', async () => {
    const TooltipElement = defineTarget({
      tagName: 'media-tooltip',
      import: { from: '@fixture/html/tooltip', sideEffect: true },
    });
    const registry = defineRegistry(components, {
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
    const Span = defineTarget({ tagName: 'span' });
    const SlotTarget = defineTarget<{ children?: unknown }>({
      render: ({ props }) => props.children,
    });
    const TextTarget = defineTarget<Record<string, unknown>>({
      render: ({ props }) => <Span {...props}>{props.children}</Span>,
    });
    const registry = defineRegistry(components, fixtureTargets(), {
      Slot: SlotTarget,
      Text: TextTarget,
    });
    const result = await transform(
      `
        import { Slot, Text } from '@videojs/compiler/components';

        export const view = <div><Text className="label">Hello</Text><Slot>{content}</Slot></div>;
      `,
      { config: { target: target(), plugins: [plugin(registry)] } }
    );

    expect(result.code).toContain('<span className="label">Hello</span>');
    expect(result.code).toContain('{content}');
    expect(result.code).not.toContain('@videojs/compiler/components');
  });

  it('attaches named templates with template-local part targets', async () => {
    const Span = defineTarget({ tagName: 'span' });
    const Label = defineTarget<Record<string, unknown> & { item: { label: unknown } }>({
      render: ({ props }) => <Span {...props}>{props.item.label}</Span>,
    });
    const registry = defineRegistry(components, fixtureTargets(), {
      Template: {
        item: {
          attach: {
            prop: 'renderItem',
            parameters: ['props', 'item'],
            spread: 'props',
          },
          parts: { label: Label },
        },
      },
    });
    const result = await transform(
      `
        import { Template } from '@videojs/compiler/components';

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
});
