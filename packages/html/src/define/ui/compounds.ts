import { AlertDialogCloseElement } from '../../ui/alert-dialog/alert-dialog-close-element';
import { AlertDialogDescriptionElement } from '../../ui/alert-dialog/alert-dialog-description-element';
import { AlertDialogTitleElement } from '../../ui/alert-dialog/alert-dialog-title-element';
import { ControlsElement } from '../../ui/controls/controls-element';
import { ControlsGroupElement } from '../../ui/controls/controls-group-element';
import { ErrorDialogElement } from '../../ui/error-dialog/error-dialog-element';
import { SliderBufferElement } from '../../ui/slider/slider-buffer-element';
import { SliderElement } from '../../ui/slider/slider-element';
import { SliderFillElement } from '../../ui/slider/slider-fill-element';
import { SliderPreviewElement } from '../../ui/slider/slider-preview-element';
import { SliderThumbElement } from '../../ui/slider/slider-thumb-element';
import { SliderThumbnailElement } from '../../ui/slider/slider-thumbnail-element';
import { SliderTrackElement } from '../../ui/slider/slider-track-element';
import { SliderValueElement } from '../../ui/slider/slider-value-element';
import { TimeElement } from '../../ui/time/time-element';
import { TimeGroupElement } from '../../ui/time/time-group-element';
import { TimeSeparatorElement } from '../../ui/time/time-separator-element';
import { TimeSliderElement } from '../../ui/time-slider/time-slider-element';
import { VolumeSliderElement } from '../../ui/volume-slider/volume-slider-element';
import { safeDefine } from '../safe-define';

// ── Define functions ────────────────────────────────────────────────────

export function defineControls(): void {
  safeDefine(ControlsElement);
  safeDefine(ControlsGroupElement);
}

export function defineErrorDialog(): void {
  // Parent first — child elements consume its context.
  safeDefine(ErrorDialogElement);
  safeDefine(AlertDialogCloseElement);
  safeDefine(AlertDialogDescriptionElement);
  safeDefine(AlertDialogTitleElement);
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

export function defineVolumeSlider(): void {
  safeDefine(VolumeSliderElement);
  defineSliderParts();
}
