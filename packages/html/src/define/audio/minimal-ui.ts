// Registers the audio player, container, and all audio UI custom elements
// used by the minimal skin without creating a skin element. Use this entry
// when building an ejected (light DOM) player layout.
import { MediaContainerElement } from '../../media/container-element';
import { BufferingIndicatorElement } from '../../ui/buffering-indicator/buffering-indicator-element';
import { HotkeyElement } from '../../ui/hotkey/hotkey-element';
import { MuteButtonElement } from '../../ui/mute-button/mute-button-element';
import { PlayButtonElement } from '../../ui/play-button/play-button-element';
import { PlaybackRateButtonElement } from '../../ui/playback-rate-button/playback-rate-button-element';
import { PlaybackRateRadioGroupElement } from '../../ui/playback-rate-radio-group/playback-rate-radio-group-element';
import { PopoverElement } from '../../ui/popover/popover-element';
import { SeekButtonElement } from '../../ui/seek-button/seek-button-element';
import { TooltipElement } from '../../ui/tooltip/tooltip-element';
import { TooltipGroupElement } from '../../ui/tooltip/tooltip-group-element';
import { TooltipLabelElement } from '../../ui/tooltip/tooltip-label-element';
import { TooltipShortcutElement } from '../../ui/tooltip/tooltip-shortcut-element';
import { safeDefine } from '../safe-define';
import { defineErrorDialog, defineMenu, defineTime, defineTimeSlider, defineVolumeSlider } from '../ui/compounds';

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
defineMenu();

// Standalone elements.
safeDefine(BufferingIndicatorElement);
safeDefine(HotkeyElement);
safeDefine(MuteButtonElement);
safeDefine(PlayButtonElement);
safeDefine(PlaybackRateButtonElement);
safeDefine(PlaybackRateRadioGroupElement);
safeDefine(PopoverElement);
safeDefine(SeekButtonElement);
safeDefine(TooltipLabelElement);
safeDefine(TooltipShortcutElement);
safeDefine(TooltipElement);
safeDefine(TooltipGroupElement);
