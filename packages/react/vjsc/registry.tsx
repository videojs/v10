/** @jsxRuntime automatic */
/** @jsxImportSource vjsc/registry */

import { schema } from '@videojs/core/vjsc';
import ts from 'typescript';
import { createArrowFunction } from 'vjsc/ast';
import type { TemplatePartProps, TemplateProps } from 'vjsc/components';
import {
  type ComponentRegistry,
  defineElement,
  defineRegistry,
  Host,
  type RegistryEntry,
  type RegistryPropTransformContext,
  type RegistryRenderContext,
} from 'vjsc/registry';
import * as $ from './entries.generated';

const Div = defineElement('div', {
  props: {
    from: 'react',
    name: 'ComponentProps',
    intrinsic: 'div',
  },
});

const Span = defineElement('span');
const Sup = defineElement('sup');

interface OptionPartProps extends TemplatePartProps {
  readonly item: {
    readonly badge?: unknown;
    readonly label: unknown;
    readonly tier?: unknown;
  };
}

const optionLabel: RegistryEntry<OptionPartProps> = {
  render: ({ props }) => <Span {...props}>{props.item.label}</Span>,
};

/** Canonical core components rendered through the React component package. */
export const registry: ComponentRegistry = defineRegistry({
  schema,
  entries: {
    ...$.entries,

    Popover: {
      parts: {
        ...$.Popover,
        Trigger: {
          host: $.Popover.Trigger,
          render: ({ props }) => <Host render={props.children} {...props} />,
        },
      },
    },

    Poster: {
      props: {
        ...$.Poster.props,
        children: 'render',
      },
      render: ({ props, reference }) => {
        const PosterPrimitive = reference($.Poster);

        return <PosterPrimitive render={props.children} {...props} />;
      },
    },

    Slider: {
      ...$.Slider,
      Thumbnail: {
        Root: Div,
        Image: {
          import: {
            from: '@videojs/react',
            name: 'Slider',
            path: ['Thumbnail'],
          },
        },
      },
    },

    Tooltip: {
      parts: {
        ...$.Tooltip,
        Trigger: {
          host: $.Tooltip.Trigger,
          render: ({ props }) => <Host render={props.children} {...props} />,
        },
      },
    },
  },
  props: {
    transform: transformReactProp,
  },
  types: (name) =>
    name === 'VjscNode'
      ? { from: 'react', name: 'ReactNode' }
      : name === 'VjscElement'
        ? { from: 'react', name: 'ReactElement' }
        : false,
  primitives: {
    Group: Div,
    Slot: ({ props }) => props.children,
    Text: {
      render: ({ props, reference }) => {
        const I18nText = reference({
          import: {
            from: '@videojs/react',
            name: 'Text',
          },
        });

        return props.token ? (
          <I18nText {...props}>{props.children}</I18nText>
        ) : (
          <Span {...props}>{props.children}</Span>
        );
      },
    },
    Template: {
      chapter: {
        render: ({ props, reference }) => {
          const RenderChapter = reference(renderCallback(['props']));

          return (
            <Host
              renderChapter={
                <RenderChapter>
                  <Div {...props}>{props.children}</Div>
                </RenderChapter>
              }
            />
          );
        },
      },
      'quality-option': {
        render: renderOption,
        parts: {
          label: optionLabel,
          tier: {
            when: ({ props }) => props.item.tier,
            render: ({ props }) => <Sup {...props}>{props.item.tier}</Sup>,
          },
          badge: {
            when: ({ props }) => props.item.badge,
            render: ({ props }) => <Span {...props}>{props.item.badge}</Span>,
          },
        },
      },
      'audio-track-option': {
        render: renderOption,
        parts: { label: optionLabel },
      },
      'playback-rate-option': {
        render: renderOption,
        parts: { label: optionLabel },
      },
      'captions-option': {
        render: renderOption,
        parts: { label: optionLabel },
      },
    },
  },
});

function renderCallback(parameters: readonly string[]) {
  return {
    transform: ({ factory, render }) =>
      createArrowFunction(parameters, render({ parameters, spreadProps: 'props' }), factory),
  } satisfies RegistryEntry;
}

function renderOption({ props, reference }: RegistryRenderContext<Omit<TemplateProps, 'name'>>) {
  const RenderItem = reference(renderCallback(['props', 'item']));

  return <Host renderItem={<RenderItem>{props.children}</RenderItem>} />;
}

function transformReactProp({
  name,
  value,
  entry,
  factory,
  import: requestImport,
}: RegistryPropTransformContext): ts.Expression | undefined {
  if (name !== 'className' || !ts.isArrayLiteralExpression(value)) return undefined;

  const cn = requestImport({ from: '@videojs/utils/style', name: 'cn' });
  const items = [...value.elements];
  const forwarded = items.some((item) => ts.isIdentifier(item) && item.text === 'className');

  if (!forwarded || !acceptsClassNameCallback(entry)) {
    return factory.createCallExpression(cn, undefined, items);
  }

  const resolveClassName = requestImport({ from: '@videojs/utils/style', name: 'resolveClassName' });
  return createArrowFunction(
    ['state'],
    factory.createCallExpression(cn, undefined, [
      ...items.filter((item) => !ts.isIdentifier(item) || item.text !== 'className'),
      factory.createCallExpression(resolveClassName, undefined, [
        factory.createIdentifier('className'),
        factory.createIdentifier('state'),
      ]),
    ]),
    factory
  );
}

function acceptsClassNameCallback(entry: RegistryPropTransformContext['entry']): boolean {
  return Boolean(
    entry && !('tagName' in entry) && entry.import.from === '@videojs/react' && entry.import.name !== 'Container'
  );
}
