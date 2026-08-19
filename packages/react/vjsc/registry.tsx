/** @jsxRuntime automatic */
/** @jsxImportSource vjsc/components/registry */

import { components } from '@videojs/core/vjsc';
import ts from 'typescript';
import { createArrowFunction } from 'vjsc/ast';
import {
  type ComponentRegistry,
  defineElement,
  defineRegistry,
  defineRegistryPart,
  defineTarget,
  Host,
  type RegistryPropTransformContext,
  type SlotProps,
  type TemplatePartProps,
  type TextProps,
} from 'vjsc/components';
import { targets as t } from './components.generated';

const Div = defineElement('div', {
  props: {
    from: 'react',
    name: 'ComponentProps',
    intrinsic: 'div',
  },
});

const Span = defineElement('span');
const Sup = defineElement('sup');

const Slot = defineTarget<SlotProps>({
  render: ({ props }) => props.children,
});

const I18nText = defineTarget<TextProps>({
  import: {
    from: '@videojs/react',
    name: 'Text',
  },
});

const Text = defineTarget<TextProps>({
  render: ({ props }) =>
    props.token ? <I18nText {...props}>{props.children}</I18nText> : <Span {...props}>{props.children}</Span>,
});

const SliderThumbnail = defineTarget({
  import: {
    from: '@videojs/react',
    name: 'Slider',
    path: ['Thumbnail'],
  },
});

const Poster = defineTarget({
  props: { from: '@videojs/react', name: 'Poster', path: ['Props'], children: 'render' },
  render: ({ props }) => <t.Poster render={props.children} {...props} />,
});

const RenderChapter = renderCallback(['props']);
const RenderItem = renderCallback(['props', 'item']);

interface OptionPartProps extends TemplatePartProps {
  readonly item: {
    readonly badge?: unknown;
    readonly label: unknown;
    readonly tier?: unknown;
  };
}

const Label = defineTarget<OptionPartProps>({
  render: ({ props }) => <Span {...props}>{props.item.label}</Span>,
});
const Tier = defineTarget<OptionPartProps>({
  when: ({ props }) => props.item.tier,
  render: ({ props }) => <Sup {...props}>{props.item.tier}</Sup>,
});
const Badge = defineTarget<OptionPartProps>({
  when: ({ props }) => props.item.badge,
  render: ({ props }) => <Span {...props}>{props.item.badge}</Span>,
});

/** Canonical core components rendered through the React component package. */
export const registry: ComponentRegistry = defineRegistry({
  components,
  targets: {
    ...t,

    Popover: {
      parts: {
        ...t.Popover,
        Trigger: {
          host: t.Popover.Trigger,
          render: defineRegistryPart(({ props }) => <Host render={props.children} {...props} />),
        },
      },
    },

    Poster,

    Slider: {
      ...t.Slider,
      Thumbnail: {
        Root: Div,
        Image: SliderThumbnail,
      },
    },

    Tooltip: {
      parts: {
        ...t.Tooltip,
        Trigger: {
          host: t.Tooltip.Trigger,
          render: defineRegistryPart(({ props }) => <Host render={props.children} {...props} />),
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
    Slot,
    Text,
    Template: {
      chapter: {
        render: ({ props }) => (
          <Host
            renderChapter={
              <RenderChapter>
                <Div {...props}>{props.children}</Div>
              </RenderChapter>
            }
          />
        ),
      },
      'quality-option': {
        render: ({ props }) => <Host renderItem={<RenderItem>{props.children}</RenderItem>} />,
        parts: {
          label: Label,
          tier: Tier,
          badge: Badge,
        },
      },
      'audio-track-option': {
        render: ({ props }) => <Host renderItem={<RenderItem>{props.children}</RenderItem>} />,
        parts: { label: Label },
      },
      'playback-rate-option': {
        render: ({ props }) => <Host renderItem={<RenderItem>{props.children}</RenderItem>} />,
        parts: { label: Label },
      },
      'captions-option': {
        render: ({ props }) => <Host renderItem={<RenderItem>{props.children}</RenderItem>} />,
        parts: { label: Label },
      },
    },
  },
});

function renderCallback(parameters: readonly string[]) {
  return defineTarget({
    transform: ({ factory, render }) =>
      createArrowFunction(parameters, render({ parameters, spreadProps: 'props' }), factory),
  });
}

function transformReactProp({
  name,
  value,
  target,
  factory,
  import: requestImport,
}: RegistryPropTransformContext): ts.Expression | undefined {
  if (name !== 'className' || !ts.isArrayLiteralExpression(value)) return undefined;

  const cn = requestImport({ from: '@videojs/utils/style', name: 'cn' });
  const items = [...value.elements];
  const forwarded = items.some((item) => ts.isIdentifier(item) && item.text === 'className');

  if (!forwarded || !acceptsClassNameCallback(target)) {
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

function acceptsClassNameCallback(target: RegistryPropTransformContext['target']): boolean {
  return Boolean(
    target && !('tagName' in target) && target.import.from === '@videojs/react' && target.import.name !== 'Container'
  );
}
