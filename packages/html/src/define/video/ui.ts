// Registers the video player, container, and all video UI custom elements
// without creating a skin element. Use this entry when building an ejected
// (light DOM) player layout.
import { MediaContainerElement } from '../../media/container-element';
import { AlertDialogCloseElement } from '../../ui/alert-dialog/alert-dialog-close-element';
import { AlertDialogDescriptionElement } from '../../ui/alert-dialog/alert-dialog-description-element';
import { AlertDialogTitleElement } from '../../ui/alert-dialog/alert-dialog-title-element';
import { BufferingIndicatorElement } from '../../ui/buffering-indicator/buffering-indicator-element';
import { CaptionsButtonElement } from '../../ui/captions-button/captions-button-element';
import { ControlsElement } from '../../ui/controls/controls-element';
import { ControlsGroupElement } from '../../ui/controls/controls-group-element';
import { ErrorDialogElement } from '../../ui/error-dialog/error-dialog-element';
import { FullscreenButtonElement } from '../../ui/fullscreen-button/fullscreen-button-element';
import { HotkeyElement } from '../../ui/hotkey/hotkey-element';
import { MuteButtonElement } from '../../ui/mute-button/mute-button-element';
import { PiPButtonElement } from '../../ui/pip-button/pip-button-element';
import { PlayButtonElement } from '../../ui/play-button/play-button-element';
import { PlaybackRateButtonElement } from '../../ui/playback-rate-button/playback-rate-button-element';
import { PopoverElement } from '../../ui/popover/popover-element';
import { PosterElement } from '../../ui/poster/poster-element';
import { SeekButtonElement } from '../../ui/seek-button/seek-button-element';
import { SliderBufferElement } from '../../ui/slider/slider-buffer-element';
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
import { TooltipElement } from '../../ui/tooltip/tooltip-element';
import { TooltipGroupElement } from '../../ui/tooltip/tooltip-group-element';
import { VolumeSliderElement } from '../../ui/volume-slider/volume-slider-element';
import { safeDefine } from '../safe-define';

// Value import — player.ts body runs before this module's body.
import { VideoPlayerElement } from './player';

// ── Registration (providers / parents first) ────────────────────────────

safeDefine(VideoPlayerElement);
safeDefine(MediaContainerElement);

// Parent/composite elements before their children.
safeDefine(ControlsElement);
safeDefine(ControlsGroupElement);
safeDefine(ErrorDialogElement);
safeDefine(AlertDialogCloseElement);
safeDefine(AlertDialogDescriptionElement);
safeDefine(AlertDialogTitleElement);
safeDefine(TimeSliderElement);
safeDefine(SliderBufferElement);
safeDefine(SliderFillElement);
safeDefine(SliderPreviewElement);
safeDefine(SliderThumbElement);
safeDefine(SliderThumbnailElement);
safeDefine(SliderTrackElement);
safeDefine(SliderValueElement);
safeDefine(VolumeSliderElement);
safeDefine(TimeElement);
safeDefine(TimeGroupElement);
safeDefine(TimeSeparatorElement);

// Standalone elements.
safeDefine(BufferingIndicatorElement);
safeDefine(CaptionsButtonElement);
safeDefine(FullscreenButtonElement);
safeDefine(HotkeyElement);
safeDefine(MuteButtonElement);
safeDefine(PiPButtonElement);
safeDefine(PlayButtonElement);
safeDefine(PlaybackRateButtonElement);
safeDefine(PopoverElement);
safeDefine(PosterElement);
safeDefine(SeekButtonElement);
safeDefine(TooltipElement);
safeDefine(TooltipGroupElement);
