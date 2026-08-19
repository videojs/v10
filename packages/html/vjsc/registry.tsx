/** @jsxRuntime automatic */
/** @jsxImportSource vjsc/registry */

import { schema } from '@videojs/core/vjsc';
import { Fragment } from 'vjsc/components';
import { type ComponentRegistry, defineElement, defineRegistry, Host, type RegistryEntry } from 'vjsc/registry';
import * as $ from './entries.generated';

const Button = defineElement('button');
const Div = defineElement('div');
const Slot = defineElement('slot');
const Span = defineElement('span');
const Sup = defineElement('sup');
const HtmlTemplate = defineElement('template');

const optionLabel: RegistryEntry = {
  render: ({ props }) => <Span data-part="label" {...props} />,
};

/** Canonical core components rendered through registered Video.js custom elements. */
export const registry: ComponentRegistry = defineRegistry({
  schema,
  entries: {
    ...$.entries,

    Container: $.MediaContainer,
    Controls: {
      parts: {
        Root: $.Controls,
        Group: $.ControlsGroup,
      },
    },
    ErrorDialog: {
      parts: {
        Root: Fragment,
        Popup: $.ErrorDialog,
        Title: $.AlertDialogTitle,
        Description: $.AlertDialogDescription,
        Close: $.AlertDialogClose,
      },
    },
    Menu: {
      parts: {
        Root: {
          host: $.Menu,
          render: ({ props }) => <Host {...props}>{props.children}</Host>,
        },
        Trigger: ({ props, id }) => (
          <Button commandfor={id('content')} {...props}>
            {props.children}
          </Button>
        ),
        SubmenuTrigger: ({ props, id, reference }) => {
          const MenuItem = reference($.MenuItem);

          return (
            <MenuItem commandfor={id('content')} data-has-submenu="" {...props}>
              {props.children}
            </MenuItem>
          );
        },
        Content: ({ props, id, reference }) => {
          const Menu = reference($.Menu);

          return (
            <Menu id={id('content')} {...props}>
              {props.children}
            </Menu>
          );
        },
        Group: Fragment,
        GroupLabel: $.MenuGroupLabel,
        Item: $.MenuItem,
        ItemIndicator: $.MenuItemIndicator,
        RadioGroup: $.MenuRadioGroup,
        RadioItem: $.MenuRadioItem,
        Separator: Div,
        CheckboxItem: $.MenuCheckboxItem,
      },
    },
    Popover: {
      parts: {
        Popup: $.Popover,
      },
      render: ({ root, parts, reference }) => {
        const Popover = reference($.Popover);

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
      Root: $.SeekIndicator,
      Value: $.SeekIndicatorValue,
    },
    Slider: {
      Root: $.Slider,
      Track: $.SliderTrack,
      Fill: $.SliderFill,
      Buffer: $.SliderBuffer,
      Thumb: $.SliderThumb,
      Thumbnail: {
        Root: Div,
        Image: $.SliderThumbnail,
      },
      Preview: $.SliderPreview,
      Value: $.SliderValue,
    },
    StatusIndicator: {
      Root: $.StatusIndicator,
      Value: $.StatusIndicatorValue,
    },
    Time: {
      Group: $.TimeGroup,
      Separator: $.TimeSeparator,
      Value: $.Time,
    },
    TimeSlider: {
      Root: $.TimeSlider,
      Track: $.SliderTrack,
      Fill: $.SliderFill,
      Buffer: $.SliderBuffer,
      Thumb: $.SliderThumb,
      Chapters: $.TimeSliderChapters,
      ChapterTitle: $.TimeSliderChapterTitle,
      Preview: $.SliderPreview,
      Value: $.SliderValue,
    },
    Tooltip: {
      parts: {
        Provider: $.TooltipGroup,
        Popup: $.Tooltip,
        Label: $.TooltipLabel,
        Shortcut: $.TooltipShortcut,
      },
      render: ({ root, parts, id, reference }) => {
        const Tooltip = reference($.Tooltip);

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
      Root: $.VolumeIndicator,
      Fill: $.VolumeIndicatorFill,
      Value: $.VolumeIndicatorValue,
    },
    VolumeSlider: {
      Root: $.VolumeSlider,
      Track: $.SliderTrack,
      Fill: $.SliderFill,
      Thumb: $.SliderThumb,
      Preview: $.SliderPreview,
      Value: $.SliderValue,
    },
  },
  primitives: {
    Group: Div,
    Slot,
    Text: {
      render: ({ props, reference }) => {
        const I18nText = reference($.Text);

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
