/** @jsxImportSource vjsc/target */

import type coreSchema from '@videojs/core/vjsc';
import { type ComponentTarget, defineComponentTarget, type TemplateTargetDefinition } from 'vjsc/target';
import { Host } from 'vjsc/target/jsx-runtime';

import { reactComponentTransform } from './react-transform.ts';

type CoreSchema = typeof coreSchema;

export const reactComponentTarget: ComponentTarget<CoreSchema> = defineComponentTarget<CoreSchema>()(({
  target,
  code,
  element,
  imported,
}) => {
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
    render: ({ children }) => <Host renderItem={code.fn([renderProps, item], code.withProps(children, renderProps))} />,
    parts: {
      label: ({ props }) => <Span {...props}>{item.label}</Span>,
    },
  };

  return {
    source: '@videojs/core/vjsc',
    resolve: ({ component, part }) => {
      const path = part ? part.split('.') : [];
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
      Controls: {
        Root: ({ children }) => <target.Controls.Root>{children}</target.Controls.Root>,
      },
      ErrorDialog: {
        Root: ({ children }) => <target.ErrorDialog.Root>{children}</target.ErrorDialog.Root>,
      },
      Popover: {
        Trigger: ({ props, children }) => <target.Popover.Trigger render={children} {...props} />,
      },
      VolumePopover: {
        Trigger: ({ props, children }) => <target.VolumePopover.Trigger render={children} {...props} />,
      },
      Poster: ({ props, children }) => <target.Poster render={children} {...props} />,
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
        Trigger: ({ props, children }) => <target.Tooltip.Trigger render={children} {...props} />,
      },
    },
    primitives: {
      Box: Div,
      Slot: ({ children }) => children,
      Text: ({ props, children }) =>
        props.has('token') ? <I18nText {...props}>{children}</I18nText> : <Span {...props}>{children}</Span>,
      Template: {
        chapter: {
          render: ({ props, children }) => (
            <Host
              renderChapter={code.fn(
                [renderProps],
                <Div {...props} {...renderProps}>
                  {children}
                </Div>
              )}
            />
          ),
        },
        'quality-option': {
          ...optionTemplate,
          parts: {
            ...optionTemplate.parts,
            tier: ({ props }) => code.when(item.tier, <Sup {...props}>{item.tier}</Sup>),
            badge: ({ props }) => code.when(item.badge, <Span {...props}>{item.badge}</Span>),
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
});
