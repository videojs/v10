/** @jsxRuntime automatic */
/** @jsxImportSource vjsc/components/registry */

import type { MenuProps, MenuTriggerProps } from '@videojs/core';
import { components } from '@videojs/core/vjsc';
import {
  type ComponentRegistry,
  defineElement,
  defineRegistry,
  defineRegistryPart,
  defineTarget,
  Fragment,
  Host,
  type TextProps,
} from 'vjsc/components';
import * as Element from './components.generated';

const Button = defineElement('button');
const Div = defineElement('div');
const Slot = defineElement('slot');
const Span = defineElement('span');
const Sup = defineElement('sup');
const HtmlTemplate = defineElement('template');

const Label = defineTarget<Record<string, unknown>>({
  render: ({ props }) => <Span data-part="label" {...props} />,
});
const Tier = defineTarget<Record<string, unknown>>({
  render: ({ props }) => <Sup data-part="tier" {...props} />,
});
const Badge = defineTarget<Record<string, unknown>>({
  render: ({ props }) => <Span data-part="badge" {...props} />,
});

const Text = defineTarget<TextProps>({
  render: ({ props }) =>
    props.token ? <Element.Text {...props}>{props.children}</Element.Text> : <Span {...props}>{props.children}</Span>,
});

/** Canonical core components rendered through registered Video.js custom elements. */
export const registry: ComponentRegistry = defineRegistry({
  components,
  targets: {
    ...Element.targets,

    Container: Element.MediaContainer,
    Controls: {
      parts: {
        Root: Element.Controls,
        Group: Element.ControlsGroup,
      },
    },
    ErrorDialog: {
      parts: {
        Root: Fragment,
        Popup: Element.ErrorDialog,
        Title: Element.AlertDialogTitle,
        Description: Element.AlertDialogDescription,
        Close: Element.AlertDialogClose,
      },
    },
    Menu: {
      parts: {
        Root: {
          host: Element.Menu,
          render: defineRegistryPart<MenuProps>(({ props }) => <Host {...props}>{props.children}</Host>),
        },
        Trigger: defineRegistryPart<MenuTriggerProps>(({ props, id }) => (
          <Button commandfor={id('content')} {...props}>
            {props.children}
          </Button>
        )),
        SubmenuTrigger: defineRegistryPart<MenuTriggerProps>(({ props, id }) => (
          <Element.MenuItem commandfor={id('content')} data-has-submenu="" {...props}>
            {props.children}
          </Element.MenuItem>
        )),
        Content: defineRegistryPart(({ props, id }) => (
          <Element.Menu id={id('content')} {...props}>
            {props.children}
          </Element.Menu>
        )),
        Group: Fragment,
        GroupLabel: Element.MenuGroupLabel,
        Item: Element.MenuItem,
        ItemIndicator: Element.MenuItemIndicator,
        RadioGroup: Element.MenuRadioGroup,
        RadioItem: Element.MenuRadioItem,
        Separator: Div,
        CheckboxItem: Element.MenuCheckboxItem,
      },
    },
    Popover: {
      parts: {
        Popup: Element.Popover,
      },
      render: ({ root, parts }) => (
        <>
          {parts.Trigger.one().props.children}
          <Element.Popover {...root.props} {...parts.Popup.one().props}>
            {parts.Popup.one().props.children}
          </Element.Popover>
        </>
      ),
    },
    SeekIndicator: {
      Root: Element.SeekIndicator,
      Value: Element.SeekIndicatorValue,
    },
    Slider: {
      Root: Element.Slider,
      Track: Element.SliderTrack,
      Fill: Element.SliderFill,
      Buffer: Element.SliderBuffer,
      Thumb: Element.SliderThumb,
      Thumbnail: {
        Root: Div,
        Image: Element.SliderThumbnail,
      },
      Preview: Element.SliderPreview,
      Value: Element.SliderValue,
    },
    StatusIndicator: {
      Root: Element.StatusIndicator,
      Value: Element.StatusIndicatorValue,
    },
    Time: {
      Group: Element.TimeGroup,
      Separator: Element.TimeSeparator,
      Value: Element.Time,
    },
    TimeSlider: {
      Root: Element.TimeSlider,
      Track: Element.SliderTrack,
      Fill: Element.SliderFill,
      Buffer: Element.SliderBuffer,
      Thumb: Element.SliderThumb,
      Chapters: Element.TimeSliderChapters,
      ChapterTitle: Element.TimeSliderChapterTitle,
      Preview: Element.SliderPreview,
      Value: Element.SliderValue,
    },
    Tooltip: {
      parts: {
        Provider: Element.TooltipGroup,
        Popup: Element.Tooltip,
        Label: Element.TooltipLabel,
        Shortcut: Element.TooltipShortcut,
      },
      render: ({ root, parts, id }) => (
        <>
          <Host id={id('trigger')}>{parts.Trigger.one().props.children}</Host>
          <Element.Tooltip trigger={id('trigger')} {...root.props} {...parts.Popup.one().props}>
            {parts.Popup.one().props.children}
          </Element.Tooltip>
        </>
      ),
    },
    VolumeIndicator: {
      Root: Element.VolumeIndicator,
      Fill: Element.VolumeIndicatorFill,
      Value: Element.VolumeIndicatorValue,
    },
    VolumeSlider: {
      Root: Element.VolumeSlider,
      Track: Element.SliderTrack,
      Fill: Element.SliderFill,
      Thumb: Element.SliderThumb,
      Preview: Element.SliderPreview,
      Value: Element.SliderValue,
    },
  },
  primitives: {
    Group: Div,
    Slot,
    Text,
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
          label: Label,
          tier: Tier,
          badge: Badge,
        },
      },
      'audio-track-option': {
        render: ({ props }) => <HtmlTemplate>{props.children}</HtmlTemplate>,
        parts: { label: Label },
      },
      'playback-rate-option': {
        render: ({ props }) => <HtmlTemplate>{props.children}</HtmlTemplate>,
        parts: { label: Label },
      },
      'captions-option': {
        render: ({ props }) => <HtmlTemplate>{props.children}</HtmlTemplate>,
        parts: { label: Label },
      },
    },
  },
});
