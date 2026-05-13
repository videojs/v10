// Registers the audio player, container, and all audio UI custom elements
// without creating a skin element. Use this entry when building an ejected
// (light DOM) player layout.
import { MediaContainerElement } from '../../media/container-element';
import { GestureElement } from '../../ui/gesture/gesture-element';
import { HotkeyElement } from '../../ui/hotkey/hotkey-element';
import { LiveButtonElement } from '../../ui/live-button/live-button-element';
import { MuteButtonElement } from '../../ui/mute-button/mute-button-element';
import { PlayButtonElement } from '../../ui/play-button/play-button-element';
import { PlaybackRateButtonElement } from '../../ui/playback-rate-button/playback-rate-button-element';
import { PopoverElement } from '../../ui/popover/popover-element';
import { SeekButtonElement } from '../../ui/seek-button/seek-button-element';
import { TooltipElement } from '../../ui/tooltip/tooltip-element';
import { TooltipGroupElement } from '../../ui/tooltip/tooltip-group-element';
import { TooltipLabelElement } from '../../ui/tooltip/tooltip-label-element';
import { TooltipShortcutElement } from '../../ui/tooltip/tooltip-shortcut-element';
import { safeDefine } from '../safe-define';
import { defineErrorDialog, defineTime, defineTimeSlider, defineVolumeSlider } from '../ui/compounds';

// Value import — player.ts body runs before this module's body.
import { AudioPlayerElement } from './player';

// ── Registration (providers / parents first) ────────────────────────────

safeDefine(AudioPlayerElement);
safeDefine(MediaContainerElement);

// Compound groups.
defineErrorDialog();
defineTimeSlider();
defineVolumeSlider();
defineTime();

// Standalone elements.
safeDefine(GestureElement);
safeDefine(HotkeyElement);
safeDefine(LiveButtonElement);
safeDefine(MuteButtonElement);
safeDefine(PlayButtonElement);
safeDefine(PlaybackRateButtonElement);
safeDefine(PopoverElement);
safeDefine(SeekButtonElement);
safeDefine(TooltipLabelElement);
safeDefine(TooltipShortcutElement);
safeDefine(TooltipElement);
safeDefine(TooltipGroupElement);
