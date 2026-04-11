// Registers the audio player, container, and all audio UI custom elements
// used by the minimal skin without creating a skin element. Use this entry
// when building an ejected (light DOM) player layout.
import { MediaContainerElement } from '../../media/container-element';
import { MuteButtonElement } from '../../ui/mute-button/mute-button-element';
import { PlayButtonElement } from '../../ui/play-button/play-button-element';
import { PlaybackRateButtonElement } from '../../ui/playback-rate-button/playback-rate-button-element';
import { PopoverElement } from '../../ui/popover/popover-element';
import { SeekButtonElement } from '../../ui/seek-button/seek-button-element';
import { TooltipElement } from '../../ui/tooltip/tooltip-element';
import { TooltipGroupElement } from '../../ui/tooltip/tooltip-group-element';
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
safeDefine(MuteButtonElement);
safeDefine(PlayButtonElement);
safeDefine(PlaybackRateButtonElement);
safeDefine(PopoverElement);
safeDefine(SeekButtonElement);
safeDefine(TooltipElement);
safeDefine(TooltipGroupElement);
