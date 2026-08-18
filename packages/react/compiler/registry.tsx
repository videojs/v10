/** @jsxRuntime automatic */
/** @jsxImportSource vjsc/components/registry */

import { components } from '@videojs/core/components';
import { createArrowFunction } from 'vjsc/ast';
import {
  type ComponentRegistry,
  defineRegistry,
  defineTarget,
  Host,
  type RegistryRenderContext,
  type SlotProps,
  type TemplatePartProps,
  type TextProps,
} from 'vjsc/components';
import { targets } from './components.generated';

const Div = defineTarget({ tagName: 'div' });
const Span = defineTarget({ tagName: 'span' });
const Sup = defineTarget({ tagName: 'sup' });
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
export const registry: ComponentRegistry = defineRegistry(
  components,
  {
    ...targets,

    Popover: {
      host: targets.Popover,
      parts: {
        ...targets.Popover,
        Trigger: ({ props }: RegistryRenderContext) => <Host {...props} render={props.children} />,
      },
    },

    Slider: {
      ...targets.Slider,
      Thumbnail: {
        Root: Div,
        Image: SliderThumbnail,
      },
    },

    Tooltip: {
      host: targets.Tooltip,
      parts: {
        ...targets.Tooltip,
        Trigger: ({ props }: RegistryRenderContext) => <Host {...props} render={props.children} />,
      },
    },
  },
  {
    types: (name) => (name === 'ComponentNode' ? { from: 'react', name: 'ReactElement' } : false),
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
  }
);

function renderCallback(parameters: readonly string[]) {
  return defineTarget({
    transform: ({ factory, render }) =>
      createArrowFunction(parameters, render({ parameters, spreadProps: 'props' }), factory),
  });
}
