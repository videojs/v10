import { DEFAULT_INPUT_INDICATOR_LABELS, type InputIndicatorLabels } from '../indicator/indicator-labels';
import type { InputActionEvent, MediaSnapshot } from '../input-action/input-action';
import { deriveVolumeStatus } from '../volume-indicator/volume-indicator-status';

export type IndicatorStatus =
  | 'pause'
  | 'play'
  | 'volume-off'
  | 'volume-low'
  | 'volume-high'
  | 'captions-on'
  | 'captions-off'
  | 'fullscreen'
  | 'exit-fullscreen'
  | 'pip'
  | 'exit-pip';

export interface StatusDetails {
  status: IndicatorStatus;
  label: string;
  value: string | null;
}

export function deriveStatus(
  event: InputActionEvent,
  snapshot: MediaSnapshot,
  labels: InputIndicatorLabels = DEFAULT_INPUT_INDICATOR_LABELS
): StatusDetails | null {
  switch (event.action) {
    case 'togglePaused': {
      const paused = snapshot.paused !== undefined ? !snapshot.paused : true;
      return {
        status: paused ? 'pause' : 'play',
        label: paused ? labels.paused : labels.playing,
        value: null,
      };
    }
    case 'toggleMuted':
    case 'volumeStep':
      return deriveVolumeStatus(event, snapshot, labels);
    case 'toggleSubtitles': {
      if (snapshot.subtitlesAvailable === false) return null;
      const showing = snapshot.subtitlesShowing !== undefined ? !snapshot.subtitlesShowing : true;
      return {
        status: showing ? 'captions-on' : 'captions-off',
        label: showing ? labels.captionsOn : labels.captionsOff,
        value: null,
      };
    }
    case 'toggleFullscreen': {
      const fullscreen = snapshot.fullscreen !== undefined ? !snapshot.fullscreen : true;
      return {
        status: fullscreen ? 'fullscreen' : 'exit-fullscreen',
        label: fullscreen ? labels.fullscreen : labels.exitFullscreen,
        value: null,
      };
    }
    case 'togglePictureInPicture': {
      const pip = snapshot.pip !== undefined ? !snapshot.pip : true;
      return {
        status: pip ? 'pip' : 'exit-pip',
        label: pip ? labels.pictureInPicture : labels.exitPictureInPicture,
        value: null,
      };
    }
    default:
      return null;
  }
}

export function getStatusIndicatorDisplayValue(state: { value: string | null; label: string | null }): string {
  return state.value ?? state.label ?? '';
}
