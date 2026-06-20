import type { StringWithSuggestions } from '@videojs/utils/types';

export type InputActionSource = 'gesture' | 'hotkey';

export type InputAction = StringWithSuggestions<
  | 'togglePaused'
  | 'toggleMuted'
  | 'toggleFullscreen'
  | 'toggleSubtitles'
  | 'togglePictureInPicture'
  | 'toggleControls'
  | 'seekStep'
  | 'seekToPercent'
  | 'volumeStep'
  | 'speedUp'
  | 'speedDown'
>;

export interface InputActionEvent {
  action?: string | undefined;
  value?: number | undefined;
  source?: InputActionSource | undefined;
  key?: string | undefined;
}
