/** @jsxRuntime automatic */
/** @jsxImportSource vjsc/components/registry */

import { components } from '@videojs/core/components';
import { type ComponentRegistry, defineRegistry, defineTarget, Fragment } from 'vjsc/components';
import * as Element from './components.generated';

const Div = defineTarget({ tagName: 'div' });
const Slot = defineTarget({ tagName: 'slot' });
const Span = defineTarget({ tagName: 'span' });
const Sup = defineTarget({ tagName: 'sup' });
const Template = defineTarget({ tagName: 'template' });

const Label = defineTarget<Record<string, unknown>>({
  render: ({ props }) => <Span {...props} data-part="label" />,
});
const Tier = defineTarget<Record<string, unknown>>({
  render: ({ props }) => <Sup {...props} data-part="tier" />,
});
const Badge = defineTarget<Record<string, unknown>>({
  render: ({ props }) => <Span {...props} data-part="badge" />,
});

/** Canonical core components rendered through registered Video.js custom elements. */
export const registry: ComponentRegistry = defineRegistry(
  components,
  {
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
        Root: Fragment,
        Trigger: Fragment,
        Content: Element.Menu,
        Group: Div,
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
      host: {
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
      host: {
        Provider: Element.TooltipGroup,
        Popup: Element.Tooltip,
        Label: Element.TooltipLabel,
        Shortcut: Element.TooltipShortcut,
      },
      render: ({ root, parts }) => (
        <>
          {parts.Trigger.one().props.children}
          <Element.Tooltip {...root.props} {...parts.Popup.one().props}>
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
  {
    Slot,
    Text: Element.Text,
    Template: {
      chapter: {
        target: Template,
        root: Div,
      },
      'quality-option': {
        target: Template,
        parts: {
          label: Label,
          tier: Tier,
          badge: Badge,
        },
      },
      'audio-track-option': {
        target: Template,
        parts: { label: Label },
      },
      'playback-rate-option': {
        target: Template,
        parts: { label: Label },
      },
      'captions-option': {
        target: Template,
        parts: { label: Label },
      },
    },
  }
);
