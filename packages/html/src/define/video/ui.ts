// Registers the container and all video UI custom elements
// without creating a skin element. Use this entry when building an ejected
// (light DOM) player layout.

import { I18nProviderElement } from '../../i18n/provider-element';
import { safeDefine } from '../../registration/safe-define';
import {
  defineControls,
  defineErrorDialog,
  defineInputIndicators,
  defineMenu,
  defineSliders,
  defineTime,
  defineTooltip,
} from '../../registration/ui-compounds';
import { AirPlayButtonElement } from '../../ui/airplay-button/element';
import { AudioTrackRadioGroupElement } from '../../ui/audio-track-radio-group/element';
import { BufferingIndicatorElement } from '../../ui/buffering-indicator/element';
import { CaptionsButtonElement } from '../../ui/captions-button/element';
import { CaptionsRadioGroupElement } from '../../ui/captions-radio-group/element';
import { CastButtonElement } from '../../ui/cast-button/element';
import { ContainerElement } from '../../ui/container/element';
import { FullscreenButtonElement } from '../../ui/fullscreen-button/element';
import { GestureElement } from '../../ui/gesture/element';
import { HotkeyElement } from '../../ui/hotkey/element';
import { LiveButtonElement } from '../../ui/live-button/element';
import { MuteButtonElement } from '../../ui/mute-button/element';
import { PiPButtonElement } from '../../ui/pip-button/element';
import { PlayButtonElement } from '../../ui/play-button/element';
import { PlaybackRateButtonElement } from '../../ui/playback-rate-button/element';
import { PlaybackRateRadioGroupElement } from '../../ui/playback-rate-radio-group/element';
import { PopoverElement } from '../../ui/popover/element';
import { PosterElement } from '../../ui/poster/element';
import { QualityRadioGroupElement } from '../../ui/quality-radio-group/element';
import { SeekButtonElement } from '../../ui/seek-button/element';
import { TextElement } from '../../ui/text/element';
import { TimeSliderChapterTitleElement } from '../../ui/time-slider/chapter-title';
import { TimeSliderChaptersElement } from '../../ui/time-slider/chapters';

// ── Registration (providers / parents first) ────────────────────────────

safeDefine(ContainerElement);
safeDefine(I18nProviderElement);

// Compound groups.
defineControls();
defineErrorDialog();
defineInputIndicators();
defineSliders();
safeDefine(TimeSliderChaptersElement);
safeDefine(TimeSliderChapterTitleElement);
defineTime();
defineMenu();
defineTooltip();

// Standalone elements.
safeDefine(AirPlayButtonElement);
safeDefine(AudioTrackRadioGroupElement);
safeDefine(BufferingIndicatorElement);
safeDefine(CaptionsButtonElement);
safeDefine(CastButtonElement);
safeDefine(FullscreenButtonElement);
safeDefine(GestureElement);
safeDefine(HotkeyElement);
safeDefine(LiveButtonElement);
safeDefine(MuteButtonElement);
safeDefine(PiPButtonElement);
safeDefine(PlayButtonElement);
safeDefine(PlaybackRateButtonElement);
safeDefine(PlaybackRateRadioGroupElement);
safeDefine(CaptionsRadioGroupElement);
safeDefine(PopoverElement);
safeDefine(PosterElement);
safeDefine(QualityRadioGroupElement);
safeDefine(SeekButtonElement);
safeDefine(TextElement);
