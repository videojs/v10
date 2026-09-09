// Registers the container and all audio UI custom elements
// without creating a skin element. Use this entry when building an ejected
// (light DOM) player layout.
import { I18nProviderElement } from '../../i18n/provider-element';
import { safeDefine } from '../../registration/safe-define';
import {
  defineErrorDialog,
  defineMenu,
  defineSliders,
  defineTime,
  defineTooltip,
} from '../../registration/ui-compounds';
import { BufferingIndicatorElement } from '../../ui/buffering-indicator/element';
import { ContainerElement } from '../../ui/container/element';
import { GestureElement } from '../../ui/gesture/element';
import { HotkeyElement } from '../../ui/hotkey/element';
import { LiveButtonElement } from '../../ui/live-button/element';
import { MuteButtonElement } from '../../ui/mute-button/element';
import { PlayButtonElement } from '../../ui/play-button/element';
import { PlaybackRateButtonElement } from '../../ui/playback-rate-button/element';
import { PlaybackRateRadioGroupElement } from '../../ui/playback-rate-radio-group/element';
import { PopoverElement } from '../../ui/popover/element';
import { SeekButtonElement } from '../../ui/seek-button/element';
import { TextElement } from '../../ui/text/element';
// ── Registration (providers / parents first) ────────────────────────────

safeDefine(ContainerElement);
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
