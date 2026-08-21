import type coreSchema from '@videojs/core/vjsc';
import { type ComponentTarget, defineComponentTarget, type TemplateTargetDefinition } from 'vjsc/target';
import { Host, jsx } from 'vjsc/target/jsx-runtime';
import { reactComponentTransform } from './react-transform';

type CoreSchema = typeof coreSchema;

export const reactComponentTarget: ComponentTarget<CoreSchema> = defineComponentTarget<CoreSchema>()(
  ({ target, code, element, imported }) => {
    const Div = element('div', {
      props: {
        from: 'react',
        name: 'ComponentProps',
        intrinsic: 'div',
      },
    });
    const Span = element('span');
    const Sup = element('sup');
    const I18nText = imported({ from: '@videojs/react', name: 'Text' });
    const renderProps = code.param('props');
    const item = code.param<{ badge?: unknown; label: unknown; tier?: unknown }>('item');
    const optionTemplate: TemplateTargetDefinition = {
      render: ({ children }) =>
        jsx(Host, {
          renderItem: code.fn([renderProps, item], code.withProps(children, renderProps)),
        }),
      parts: {
        label: ({ props }) => jsx(Span, { ...props, children: item.label }),
      },
    };

    return {
      source: '@videojs/core/vjsc',
      resolve: ({ component, part }) => {
        const path = part ? (part === 'SubmenuTrigger' ? 'Trigger' : part).split('.') : [];
        const propsPath = path.length === 0 ? ['Props'] : [...path.slice(0, -1), `${path.at(-1)}Props`];

        return imported({
          from: '@videojs/react',
          name: component,
          ...(path.length > 0 ? { path } : {}),
          props: {
            from: '@videojs/react',
            name: component,
            path: propsPath,
          },
        });
      },
      components: {
        Popover: {
          Trigger: ({ props, children }) => jsx(target.Popover.Trigger, { render: children, ...props }),
        },
        Poster: ({ props, children }) => jsx(target.Poster, { render: children, ...props }),
        Slider: {
          Thumbnail: {
            Root: Div,
            Image: imported({
              from: '@videojs/react',
              name: 'Slider',
              path: ['Thumbnail'],
              props: {
                from: '@videojs/react',
                name: 'Slider',
                path: ['ThumbnailProps'],
              },
            }),
          },
        },
        Tooltip: {
          Trigger: ({ props, children }) => jsx(target.Tooltip.Trigger, { render: children, ...props }),
        },
      },
      primitives: {
        Group: Div,
        Slot: ({ children }) => children,
        Text: ({ props, children }) =>
          props.has('token') ? jsx(I18nText, { ...props, children }) : jsx(Span, { ...props, children }),
        Template: {
          chapter: {
            render: ({ props, children }) =>
              jsx(Host, {
                renderChapter: code.fn([renderProps], jsx(Div, { ...props, ...renderProps, children })),
              }),
          },
          'quality-option': {
            ...optionTemplate,
            parts: {
              ...optionTemplate.parts,
              tier: ({ props }) => code.when(item.tier, jsx(Sup, { ...props, children: item.tier })),
              badge: ({ props }) => code.when(item.badge, jsx(Span, { ...props, children: item.badge })),
            },
          },
          'audio-track-option': optionTemplate,
          'playback-rate-option': optionTemplate,
          'captions-option': optionTemplate,
        },
      },
      types: {
        PropsOf: { from: 'react', name: 'ComponentProps' },
        VjscNode: { from: 'react', name: 'ReactNode' },
        VjscElement: { from: 'react', name: 'ReactElement' },
      },
      transforms: [reactComponentTransform],
      jsx: { importSource: 'react', attributes: 'react' },
    };
  }
);
