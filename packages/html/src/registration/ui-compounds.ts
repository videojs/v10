import { AlertDialogElement } from '../ui/alert-dialog/element';
import { ControlsBackdropElement } from '../ui/controls/backdrop';
import { ControlsContentElement } from '../ui/controls/content';
import { ControlsElement } from '../ui/controls/element';
import { ControlsGroupElement } from '../ui/controls/group';
import { DialogBackdropElement } from '../ui/dialog/backdrop';
import { DialogCloseElement } from '../ui/dialog/close';
import { DialogDescriptionElement } from '../ui/dialog/description';
import { DialogPopupElement } from '../ui/dialog/popup';
import { DialogTitleElement } from '../ui/dialog/title';
import { ErrorDialogElement } from '../ui/error-dialog/element';
import { MenuCheckboxItemElement } from '../ui/menu/checkbox-item';
import { MenuContentElement } from '../ui/menu/content';
import { MenuElement } from '../ui/menu/element';
import { MenuGroupElement } from '../ui/menu/group';
import { MenuGroupLabelElement } from '../ui/menu/group-label';
import { MenuItemElement } from '../ui/menu/item';
import { MenuItemIndicatorElement } from '../ui/menu/item-indicator';
import { MenuRadioGroupElement } from '../ui/menu/radio-group';
import { MenuRadioItemElement } from '../ui/menu/radio-item';
import { MenuSeparatorElement } from '../ui/menu/separator';
import { SeekIndicatorElement } from '../ui/seek-indicator/element';
import { SeekIndicatorValueElement } from '../ui/seek-indicator/value';
import { SliderBufferElement } from '../ui/slider/buffer';
import { SliderElement } from '../ui/slider/element';
import { SliderFillElement } from '../ui/slider/fill';
import { SliderPreviewElement } from '../ui/slider/preview';
import { SliderThumbElement } from '../ui/slider/thumb';
import { SliderThumbnailElement } from '../ui/slider/thumbnail';
import { SliderTrackElement } from '../ui/slider/track';
import { SliderValueElement } from '../ui/slider/value';
import { StatusAnnouncerElement } from '../ui/status-announcer/element';
import { StatusIndicatorElement } from '../ui/status-indicator/element';
import { StatusIndicatorValueElement } from '../ui/status-indicator/value';
import { TimeSliderElement } from '../ui/time-slider/element';
import { TimeElement } from '../ui/time/element';
import { TimeGroupElement } from '../ui/time/group';
import { TimeSeparatorElement } from '../ui/time/separator';
import { TooltipElement } from '../ui/tooltip/element';
import { TooltipGroupElement } from '../ui/tooltip/group';
import { TooltipLabelElement } from '../ui/tooltip/label';
import { TooltipShortcutElement } from '../ui/tooltip/shortcut';
import { VolumeIndicatorElement } from '../ui/volume-indicator/element';
import { VolumeIndicatorFillElement } from '../ui/volume-indicator/fill';
import { VolumeIndicatorValueElement } from '../ui/volume-indicator/value';
import { VolumeSliderElement } from '../ui/volume-slider/element';
import { safeDefine } from './safe-define';

// ── Define functions ────────────────────────────────────────────────────

export function defineMenu(): void {
  // Root first — part elements consume its context.
  safeDefine(MenuElement);
  safeDefine(MenuContentElement);
  safeDefine(MenuItemElement);
  safeDefine(MenuGroupLabelElement);
  safeDefine(MenuSeparatorElement);
  safeDefine(MenuGroupElement);
  safeDefine(MenuRadioGroupElement);
  safeDefine(MenuRadioItemElement);
  safeDefine(MenuCheckboxItemElement);
  safeDefine(MenuItemIndicatorElement);
}

export function defineControls(): void {
  safeDefine(ControlsElement);
  safeDefine(ControlsBackdropElement);
  safeDefine(ControlsContentElement);
  safeDefine(ControlsGroupElement);
}

function defineDialogParts(): void {
  safeDefine(DialogBackdropElement);
  safeDefine(DialogPopupElement);
  safeDefine(DialogCloseElement);
  safeDefine(DialogDescriptionElement);
  safeDefine(DialogTitleElement);
}

export function defineAlertDialog(): void {
  // Parent first — child elements consume its context.
  safeDefine(AlertDialogElement);
  defineDialogParts();
}

export function defineErrorDialog(): void {
  // Parent first — child elements consume its context.
  safeDefine(ErrorDialogElement);
  defineDialogParts();
}

export function defineInputIndicators(): void {
  safeDefine(StatusAnnouncerElement);
  safeDefine(StatusIndicatorElement);
  safeDefine(StatusIndicatorValueElement);
  safeDefine(VolumeIndicatorElement);
  safeDefine(VolumeIndicatorFillElement);
  safeDefine(VolumeIndicatorValueElement);
  safeDefine(SeekIndicatorElement);
  safeDefine(SeekIndicatorValueElement);
}

/** Shared slider sub-elements used by all slider types. */
export function defineSliderParts(): void {
  safeDefine(SliderFillElement);
  safeDefine(SliderPreviewElement);
  safeDefine(SliderThumbElement);
  safeDefine(SliderTrackElement);
  safeDefine(SliderValueElement);
}

export function defineSlider(): void {
  safeDefine(SliderElement);
  defineSliderParts();
}

export function defineTime(): void {
  safeDefine(TimeElement);
  safeDefine(TimeGroupElement);
  safeDefine(TimeSeparatorElement);
}

export function defineTimeSlider(): void {
  safeDefine(TimeSliderElement);
  defineSliderParts();
  safeDefine(SliderBufferElement);
  safeDefine(SliderThumbnailElement);
}

export function defineTooltip(): void {
  safeDefine(TooltipGroupElement);
  safeDefine(TooltipLabelElement);
  safeDefine(TooltipShortcutElement);
  safeDefine(TooltipElement);
}

export function defineVolumeSlider(): void {
  safeDefine(VolumeSliderElement);
  defineSliderParts();
}

export function defineSliders(): void {
  safeDefine(TimeSliderElement);
  safeDefine(VolumeSliderElement);
  defineSliderParts();
  safeDefine(SliderBufferElement);
  safeDefine(SliderThumbnailElement);
}
