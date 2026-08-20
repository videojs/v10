/** @jsxRuntime automatic */
/** @jsxImportSource vjsc/registry */

import type { ComponentDefinition, ComponentSchema } from 'vjsc/components';
import { Fragment } from 'vjsc/components';
import {
  type ComponentRegistry,
  defineElement,
  defineRegistry,
  Host,
  type RegistryComponentContext,
  type RegistryEntry,
  type RegistryEntryReference,
  type RegistryRenderContext,
} from 'vjsc/registry';

export interface HtmlRegistryEntries {
  readonly entries: Readonly<Record<string, RegistryEntryReference>>;
  readonly [name: string]: unknown;
}

type OverlayParts = {
  readonly Root: ComponentDefinition<Record<string, unknown>>;
  readonly Trigger: ComponentDefinition<Record<string, unknown>>;
  readonly Popup: ComponentDefinition<Record<string, unknown>>;
};

type HtmlEntryName =
  | 'AlertDialogClose'
  | 'AlertDialogDescription'
  | 'AlertDialogTitle'
  | 'Controls'
  | 'ControlsGroup'
  | 'ErrorDialog'
  | 'MediaContainer'
  | 'Menu'
  | 'MenuCheckboxItem'
  | 'MenuGroupLabel'
  | 'MenuItem'
  | 'MenuItemIndicator'
  | 'MenuRadioGroup'
  | 'MenuRadioItem'
  | 'Popover'
  | 'SeekIndicator'
  | 'SeekIndicatorValue'
  | 'Slider'
  | 'SliderBuffer'
  | 'SliderFill'
  | 'SliderPreview'
  | 'SliderThumb'
  | 'SliderThumbnail'
  | 'SliderTrack'
  | 'SliderValue'
  | 'StatusIndicator'
  | 'StatusIndicatorValue'
  | 'Text'
  | 'Time'
  | 'TimeGroup'
  | 'TimeSeparator'
  | 'TimeSlider'
  | 'TimeSliderChapterTitle'
  | 'TimeSliderChapters'
  | 'Tooltip'
  | 'TooltipGroup'
  | 'TooltipLabel'
  | 'TooltipShortcut'
  | 'VolumeIndicator'
  | 'VolumeIndicatorFill'
  | 'VolumeIndicatorValue'
  | 'VolumeSlider';

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
export function createRegistry(schema: ComponentSchema, entries: HtmlRegistryEntries): ComponentRegistry {
  // The generated entries are validated against the schema by VJSC. Treating
  // references as `never` keeps this factory independent of generated source
  // declarations while remaining assignable to each concrete schema entry.
  const $ = entries as unknown as Readonly<Record<HtmlEntryName, never>>;

  return defineRegistry({
    schema,
    entries: {
      ...(entries.entries as Readonly<Record<string, never>>),

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
            render: ({ props }: RegistryRenderContext<Record<string, unknown>>) => (
              <Host {...props}>{props.children}</Host>
            ),
          },
          Trigger: ({ props, id }: RegistryRenderContext<Record<string, unknown>>) => (
            <Button commandfor={id('content')} {...props}>
              {props.children}
            </Button>
          ),
          SubmenuTrigger: ({ props, id, reference }: RegistryRenderContext<Record<string, unknown>>) => {
            const MenuItem = reference($.MenuItem);

            return (
              <MenuItem commandfor={id('content')} data-has-submenu="" {...props}>
                {props.children}
              </MenuItem>
            );
          },
          Content: ({ props, id, reference }: RegistryRenderContext<Record<string, unknown>>) => {
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
        render: ({ root, parts, reference }: RegistryComponentContext<OverlayParts, 'Root'>) => {
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
        render: ({ root, parts, id, reference }: RegistryComponentContext<OverlayParts, 'Root'>) => {
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
    } as unknown as never,
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
}
