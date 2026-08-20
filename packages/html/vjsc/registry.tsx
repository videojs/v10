/** @jsxRuntime automatic */
/** @jsxImportSource vjsc/registry */

import type { schema as coreSchema } from '@videojs/core/vjsc';
import { Fragment } from 'vjsc/components';
import {
  type ComponentRegistry,
  defineElement,
  defineRegistry,
  Host,
  type RegistryEntries,
  type RegistryEntry,
  resolveRegistryEntries,
} from 'vjsc/registry';
import { resolveHtmlEntry } from './resolve';

type CoreSchema = typeof coreSchema;
type CoreDefinitions = CoreSchema['definitions'];

const Button = defineElement('button');
const Div = defineElement('div');
const I18nText = defineElement('media-text', {
  import: { from: '@videojs/html/i18n', sideEffect: true },
});
const Slot = defineElement('slot');
const Span = defineElement('span');
const Sup = defineElement('sup');
const HtmlTemplate = defineElement('template');

const optionLabel: RegistryEntry = {
  render: ({ props }) => <Span data-part="label" {...props} />,
};

/** Canonical core components rendered through registered Video.js custom elements. */
export function createRegistry(schema: CoreSchema): ComponentRegistry {
  const $ = resolveRegistryEntries(schema, resolveHtmlEntry);
  const entries = {
    ...$,

    Container: $.Container,
    Controls: {
      parts: {
        Root: $.Controls.Root,
        Group: $.Controls.Group,
      },
    },
    ErrorDialog: {
      parts: {
        Root: Fragment,
        Popup: $.ErrorDialog.Popup,
        Title: $.ErrorDialog.Title,
        Description: $.ErrorDialog.Description,
        Close: $.ErrorDialog.Close,
      },
    },
    Menu: {
      parts: {
        Root: {
          host: $.Menu.Root,
          render: ({ props }) => <Host {...props}>{props.children}</Host>,
        },
        Trigger: ({ props, id }) => (
          <Button commandfor={id('content')} {...props}>
            {props.children}
          </Button>
        ),
        SubmenuTrigger: ({ props, id, reference }) => {
          const MenuItem = reference($.Menu.Item);

          return (
            <MenuItem commandfor={id('content')} data-has-submenu="" {...props}>
              {props.children}
            </MenuItem>
          );
        },
        Content: ({ props, id, reference }) => {
          const Menu = reference($.Menu.Content);

          return (
            <Menu id={id('content')} {...props}>
              {props.children}
            </Menu>
          );
        },
        Group: Fragment,
        GroupLabel: $.Menu.GroupLabel,
        Item: $.Menu.Item,
        ItemIndicator: $.Menu.ItemIndicator,
        RadioGroup: $.Menu.RadioGroup,
        RadioItem: $.Menu.RadioItem,
        Separator: Div,
        CheckboxItem: $.Menu.CheckboxItem,
      },
    },
    Popover: {
      parts: {
        Popup: $.Popover.Popup,
      },
      render: ({ root, parts, reference }) => {
        const Popover = reference($.Popover.Popup);

        return (
          <>
            {parts.Trigger.one().props.children}
            <Popover {...root.props} {...parts.Popup.one().props}>
              {parts.Popup.one().props.children}
            </Popover>
          </>
        );
      },
    },
    SeekIndicator: {
      Root: $.SeekIndicator.Root,
      Value: $.SeekIndicator.Value,
    },
    Slider: {
      Root: $.Slider.Root,
      Track: $.Slider.Track,
      Fill: $.Slider.Fill,
      Buffer: $.Slider.Buffer,
      Thumb: $.Slider.Thumb,
      Thumbnail: {
        Root: Div,
        Image: $.Slider.Thumbnail.Image,
      },
      Preview: $.Slider.Preview,
      Value: $.Slider.Value,
    },
    StatusIndicator: {
      Root: $.StatusIndicator.Root,
      Value: $.StatusIndicator.Value,
    },
    Time: {
      Group: $.Time.Group,
      Separator: $.Time.Separator,
      Value: $.Time.Value,
    },
    TimeSlider: {
      Root: $.TimeSlider.Root,
      Track: $.TimeSlider.Track,
      Fill: $.TimeSlider.Fill,
      Buffer: $.TimeSlider.Buffer,
      Thumb: $.TimeSlider.Thumb,
      Chapters: $.TimeSlider.Chapters,
      ChapterTitle: $.TimeSlider.ChapterTitle,
      Preview: $.TimeSlider.Preview,
      Value: $.TimeSlider.Value,
    },
    Tooltip: {
      parts: {
        Provider: $.Tooltip.Provider,
        Popup: $.Tooltip.Popup,
        Label: $.Tooltip.Label,
        Shortcut: $.Tooltip.Shortcut,
      },
      render: ({ root, parts, id, reference }) => {
        const Tooltip = reference($.Tooltip.Popup);

        return (
          <>
            <Host id={id('trigger')}>{parts.Trigger.one().props.children}</Host>
            <Tooltip trigger={id('trigger')} {...root.props} {...parts.Popup.one().props}>
              {parts.Popup.one().props.children}
            </Tooltip>
          </>
        );
      },
    },
    VolumeIndicator: {
      Root: $.VolumeIndicator.Root,
      Fill: $.VolumeIndicator.Fill,
      Value: $.VolumeIndicator.Value,
    },
    VolumeSlider: {
      Root: $.VolumeSlider.Root,
      Track: $.VolumeSlider.Track,
      Fill: $.VolumeSlider.Fill,
      Thumb: $.VolumeSlider.Thumb,
      Preview: $.VolumeSlider.Preview,
      Value: $.VolumeSlider.Value,
    },
  } satisfies RegistryEntries<CoreDefinitions>;

  return defineRegistry({
    schema,
    entries,
    primitives: {
      Group: Div,
      Slot,
      Text: {
        render: ({ props }) => {
          return props.token ? (
            <I18nText {...props}>{props.children}</I18nText>
          ) : (
            <Span {...props}>{props.children}</Span>
          );
        },
      },
      Template: {
        chapter: {
          render: ({ props }) => (
            <HtmlTemplate>
              <Div {...props}>{props.children}</Div>
            </HtmlTemplate>
          ),
        },
        'quality-option': {
          render: ({ props }) => <HtmlTemplate>{props.children}</HtmlTemplate>,
          parts: {
            label: optionLabel,
            tier: {
              render: ({ props }) => <Sup data-part="tier" {...props} />,
            },
            badge: {
              render: ({ props }) => <Span data-part="badge" {...props} />,
            },
          },
        },
        'audio-track-option': {
          render: ({ props }) => <HtmlTemplate>{props.children}</HtmlTemplate>,
          parts: { label: optionLabel },
        },
        'playback-rate-option': {
          render: ({ props }) => <HtmlTemplate>{props.children}</HtmlTemplate>,
          parts: { label: optionLabel },
        },
        'captions-option': {
          render: ({ props }) => <HtmlTemplate>{props.children}</HtmlTemplate>,
          parts: { label: optionLabel },
        },
      },
    },
  });
}
