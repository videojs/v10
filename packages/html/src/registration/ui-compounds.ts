import { AlertDialogElement } from '../ui/alert-dialog/alert-dialog-element';
import { ControlsBackdropElement } from '../ui/controls/controls-backdrop-element';
import { ControlsContentElement } from '../ui/controls/controls-content-element';
import { ControlsElement } from '../ui/controls/controls-element';
import { ControlsGroupElement } from '../ui/controls/controls-group-element';
import { DialogBackdropElement } from '../ui/dialog/dialog-backdrop-element';
import { DialogCloseElement } from '../ui/dialog/dialog-close-element';
import { DialogDescriptionElement } from '../ui/dialog/dialog-description-element';
import { DialogPopupElement } from '../ui/dialog/dialog-popup-element';
import { DialogTitleElement } from '../ui/dialog/dialog-title-element';
import { ErrorDialogElement } from '../ui/error-dialog/error-dialog-element';
import { MenuCheckboxItemElement } from '../ui/menu/menu-checkbox-item-element';
import { MenuContentElement } from '../ui/menu/menu-content-element';
import { MenuElement } from '../ui/menu/menu-element';
import { MenuGroupElement } from '../ui/menu/menu-group-element';
import { MenuGroupLabelElement } from '../ui/menu/menu-group-label-element';
import { MenuItemElement } from '../ui/menu/menu-item-element';
import { MenuItemIndicatorElement } from '../ui/menu/menu-item-indicator-element';
import { MenuRadioGroupElement } from '../ui/menu/menu-radio-group-element';
import { MenuRadioItemElement } from '../ui/menu/menu-radio-item-element';
import { MenuSeparatorElement } from '../ui/menu/menu-separator-element';
import { SeekIndicatorElement } from '../ui/seek-indicator/seek-indicator-element';
import { SeekIndicatorValueElement } from '../ui/seek-indicator/seek-indicator-value-element';
import { SliderBufferElement } from '../ui/slider/slider-buffer-element';
import { SliderElement } from '../ui/slider/slider-element';
import { SliderFillElement } from '../ui/slider/slider-fill-element';
import { SliderPreviewElement } from '../ui/slider/slider-preview-element';
import { SliderThumbElement } from '../ui/slider/slider-thumb-element';
import { SliderThumbnailElement } from '../ui/slider/slider-thumbnail-element';
import { SliderTrackElement } from '../ui/slider/slider-track-element';
import { SliderValueElement } from '../ui/slider/slider-value-element';
import { StatusAnnouncerElement } from '../ui/status-announcer/status-announcer-element';
import { StatusIndicatorElement } from '../ui/status-indicator/status-indicator-element';
import { StatusIndicatorValueElement } from '../ui/status-indicator/status-indicator-value-element';
import { TimeSliderElement } from '../ui/time-slider/time-slider-element';
import { TimeElement } from '../ui/time/time-element';
import { TimeGroupElement } from '../ui/time/time-group-element';
import { TimeSeparatorElement } from '../ui/time/time-separator-element';
import { TooltipElement } from '../ui/tooltip/tooltip-element';
import { TooltipGroupElement } from '../ui/tooltip/tooltip-group-element';
import { TooltipLabelElement } from '../ui/tooltip/tooltip-label-element';
import { TooltipShortcutElement } from '../ui/tooltip/tooltip-shortcut-element';
import { VolumeIndicatorElement } from '../ui/volume-indicator/volume-indicator-element';
import { VolumeIndicatorFillElement } from '../ui/volume-indicator/volume-indicator-fill-element';
import { VolumeIndicatorValueElement } from '../ui/volume-indicator/volume-indicator-value-element';
import { VolumeSliderElement } from '../ui/volume-slider/volume-slider-element';
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
