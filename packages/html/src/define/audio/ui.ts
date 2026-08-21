// Registers the container and all audio UI custom elements without creating a
// player or skin element. Use this entry when building an ejected (light DOM)
// player layout.
import { I18nProviderElement } from '../../i18n/provider-element';
import { MediaContainerElement } from '../../media/container-element';
import { BufferingIndicatorElement } from '../../ui/buffering-indicator/buffering-indicator-element';
import { GestureElement } from '../../ui/gesture/gesture-element';
import { HotkeyElement } from '../../ui/hotkey/hotkey-element';
import { LiveButtonElement } from '../../ui/live-button/live-button-element';
import { MuteButtonElement } from '../../ui/mute-button/mute-button-element';
import { PlayButtonElement } from '../../ui/play-button/play-button-element';
import { PlaybackRateButtonElement } from '../../ui/playback-rate-button/playback-rate-button-element';
import { PlaybackRateRadioGroupElement } from '../../ui/playback-rate-radio-group/playback-rate-radio-group-element';
import { PopoverElement } from '../../ui/popover/popover-element';
import { SeekButtonElement } from '../../ui/seek-button/seek-button-element';
import { TextElement } from '../../ui/text/text-element';
import { safeDefine } from '../safe-define';
import { defineErrorDialog, defineMenu, defineSliders, defineTime, defineTooltip } from '../ui/compounds';

// ── Registration (providers / parents first) ────────────────────────────

safeDefine(MediaContainerElement);
safeDefine(I18nProviderElement);

// Compound groups.
defineErrorDialog();
defineSliders();
defineTime();
defineMenu();
defineTooltip();

// Standalone elements.
safeDefine(GestureElement);
safeDefine(HotkeyElement);
safeDefine(BufferingIndicatorElement);
safeDefine(LiveButtonElement);
safeDefine(MuteButtonElement);
safeDefine(PlayButtonElement);
safeDefine(PlaybackRateButtonElement);
safeDefine(PlaybackRateRadioGroupElement);
safeDefine(PopoverElement);
safeDefine(SeekButtonElement);
safeDefine(TextElement);
