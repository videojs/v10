// Registers the live audio player, container, and all audio UI custom
// elements used by the minimal skin without creating a skin element. Use
// this entry when building an ejected (light DOM) player layout for live
// HLS / DASH streams.
import { MediaContainerElement } from '../../media/container-element';
import { LiveButtonElement } from '../../ui/live-button/live-button-element';
import { MuteButtonElement } from '../../ui/mute-button/mute-button-element';
import { PlayButtonElement } from '../../ui/play-button/play-button-element';
import { PopoverElement } from '../../ui/popover/popover-element';
import { TooltipElement } from '../../ui/tooltip/tooltip-element';
import { TooltipGroupElement } from '../../ui/tooltip/tooltip-group-element';
import { safeDefine } from '../safe-define';
import { defineErrorDialog, defineTime, defineTimeSlider, defineVolumeSlider } from '../ui/compounds';

// Value import — player.ts body runs before this module's body.
import { LiveAudioPlayerElement } from './player';

// ── Registration (providers / parents first) ────────────────────────────

safeDefine(LiveAudioPlayerElement);
safeDefine(MediaContainerElement);

// Compound groups.
defineErrorDialog();
defineTimeSlider();
defineVolumeSlider();
defineTime();

// Standalone elements.
safeDefine(LiveButtonElement);
safeDefine(MuteButtonElement);
safeDefine(PlayButtonElement);
safeDefine(PopoverElement);
safeDefine(TooltipElement);
safeDefine(TooltipGroupElement);
