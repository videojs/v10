import { safeDefine } from '../../registration/safe-define';
import {
  defineErrorDialog,
  defineMenu,
  defineTime,
  defineTimeSlider,
  defineTooltip,
  defineVolumeSlider,
} from '../../registration/ui-compounds';
// Registers the container and all audio UI custom elements
// used by the minimal skin without creating a skin element. Use this entry
// when building an ejected (light DOM) player layout.
import { BufferingIndicatorElement } from '../../ui/buffering-indicator/buffering-indicator-element';
import { ContainerElement } from '../../ui/container/container-element';
import { HotkeyElement } from '../../ui/hotkey/hotkey-element';
import { MuteButtonElement } from '../../ui/mute-button/mute-button-element';
import { PlayButtonElement } from '../../ui/play-button/play-button-element';
import { PlaybackRateButtonElement } from '../../ui/playback-rate-button/playback-rate-button-element';
import { PlaybackRateRadioGroupElement } from '../../ui/playback-rate-radio-group/playback-rate-radio-group-element';
import { PopoverElement } from '../../ui/popover/popover-element';
import { SeekButtonElement } from '../../ui/seek-button/seek-button-element';
// ── Registration (providers / parents first) ────────────────────────────

safeDefine(ContainerElement);

// Compound groups.
defineErrorDialog();
defineTimeSlider();
defineVolumeSlider();
defineTime();
defineMenu();
defineTooltip();

// Standalone elements.
safeDefine(BufferingIndicatorElement);
safeDefine(HotkeyElement);
safeDefine(MuteButtonElement);
safeDefine(PlayButtonElement);
safeDefine(PlaybackRateButtonElement);
safeDefine(PlaybackRateRadioGroupElement);
safeDefine(PopoverElement);
safeDefine(SeekButtonElement);
