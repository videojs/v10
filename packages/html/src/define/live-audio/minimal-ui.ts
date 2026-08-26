import { safeDefine } from '../../registration/safe-define';
import {
  defineErrorDialog,
  defineTime,
  defineTimeSlider,
  defineTooltip,
  defineVolumeSlider,
} from '../../registration/ui-compounds';
// Registers the container and all live audio UI custom
// elements used by the minimal skin without creating a skin element. Use
// this entry when building an ejected (light DOM) player layout for live
// HLS / DASH streams.
import { BufferingIndicatorElement } from '../../ui/buffering-indicator/buffering-indicator-element';
import { ContainerElement } from '../../ui/container/container-element';
import { HotkeyElement } from '../../ui/hotkey/hotkey-element';
import { LiveButtonElement } from '../../ui/live-button/live-button-element';
import { MuteButtonElement } from '../../ui/mute-button/mute-button-element';
import { PlayButtonElement } from '../../ui/play-button/play-button-element';
import { PopoverElement } from '../../ui/popover/popover-element';
// ── Registration (providers / parents first) ────────────────────────────

safeDefine(ContainerElement);

// Compound groups.
defineErrorDialog();
defineTimeSlider();
defineVolumeSlider();
defineTime();
defineTooltip();

// Standalone elements.
safeDefine(BufferingIndicatorElement);
safeDefine(HotkeyElement);
safeDefine(LiveButtonElement);
safeDefine(MuteButtonElement);
safeDefine(PlayButtonElement);
safeDefine(PopoverElement);
