/** @jsxRuntime automatic */
/** @jsxImportSource vjsc/components/registry */

import { components } from '@videojs/core/components';
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
const Text = defineTarget<TextProps>({
  import: {
    from: '@videojs/react',
    name: 'Text',
  },
});
const SliderThumbnail = defineTarget({
  import: {
    from: '@videojs/react',
    name: 'Slider',
    path: ['Thumbnail'],
  },
});

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
    Slot,
    Text,
    Template: {
      chapter: {
        root: Div,
        attach: {
          prop: 'renderChapter',
          parameters: ['props'],
          spread: 'props',
        },
      },
      'quality-option': {
        attach: {
          prop: 'renderItem',
          parameters: ['props', 'item'],
          spread: 'props',
        },
        parts: {
          label: Label,
          tier: Tier,
          badge: Badge,
        },
      },
      'audio-track-option': {
        attach: {
          prop: 'renderItem',
          parameters: ['props', 'item'],
          spread: 'props',
        },
        parts: { label: Label },
      },
      'playback-rate-option': {
        attach: {
          prop: 'renderItem',
          parameters: ['props', 'item'],
          spread: 'props',
        },
        parts: { label: Label },
      },
      'captions-option': {
        attach: {
          prop: 'renderItem',
          parameters: ['props', 'item'],
          spread: 'props',
        },
        parts: { label: Label },
      },
    },
  }
);
