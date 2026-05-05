import { clamp } from '@videojs/utils/number';
import { formatTime } from '@videojs/utils/time';

export type InputActionSource = 'gesture' | 'hotkey';

export type InputAction =
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
  | (string & {});

export type IndicatorDirection = 'forward' | 'backward';
export type IndicatorVolumeLevel = 'off' | 'low' | 'high';

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

export interface InputActionEvent {
  action?: string | undefined;
  value?: number | undefined;
  source?: InputActionSource | undefined;
  key?: string | undefined;
}

export interface MediaSnapshot {
  paused?: boolean | undefined;
  volume?: number | undefined;
  muted?: boolean | undefined;
  fullscreen?: boolean | undefined;
  subtitlesShowing?: boolean | undefined;
  pip?: boolean | undefined;
  currentTime?: number | undefined;
  duration?: number | undefined;
}

export interface InputIndicatorLabels {
  muted: string;
  volume: string;
  captionsOn: string;
  captionsOff: string;
  paused: string;
  playing: string;
  fullscreen: string;
  exitFullscreen: string;
  pictureInPicture: string;
  exitPictureInPicture: string;
}

export interface StatusDetails {
  status: IndicatorStatus;
  label: string;
  value: string | null;
  volumeLevel: IndicatorVolumeLevel | null;
}

export const DEFAULT_INPUT_INDICATOR_LABELS: InputIndicatorLabels = {
  muted: 'Muted',
  volume: 'Volume',
  captionsOn: 'Captions on',
  captionsOff: 'Captions off',
  paused: 'Paused',
  playing: 'Playing',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit fullscreen',
  pictureInPicture: 'Picture in picture',
  exitPictureInPicture: 'Exit picture in picture',
};

export function isVolumeIndicatorAction(action: string | null | undefined): action is 'toggleMuted' | 'volumeStep' {
  return action === 'toggleMuted' || action === 'volumeStep';
}

export function isSeekIndicatorAction(action: string | null | undefined): action is 'seekStep' | 'seekToPercent' {
  return action === 'seekStep' || action === 'seekToPercent';
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
        volumeLevel: null,
      };
    }
    case 'toggleMuted':
    case 'volumeStep':
      return deriveVolumeStatus(event, snapshot, labels);
    case 'toggleSubtitles': {
      const showing = snapshot.subtitlesShowing !== undefined ? !snapshot.subtitlesShowing : true;
      return {
        status: showing ? 'captions-on' : 'captions-off',
        label: showing ? labels.captionsOn : labels.captionsOff,
        value: null,
        volumeLevel: null,
      };
    }
    case 'toggleFullscreen': {
      const fullscreen = snapshot.fullscreen !== undefined ? !snapshot.fullscreen : true;
      return {
        status: fullscreen ? 'fullscreen' : 'exit-fullscreen',
        label: fullscreen ? labels.fullscreen : labels.exitFullscreen,
        value: null,
        volumeLevel: null,
      };
    }
    case 'togglePictureInPicture': {
      const pip = snapshot.pip !== undefined ? !snapshot.pip : true;
      return {
        status: pip ? 'pip' : 'exit-pip',
        label: pip ? labels.pictureInPicture : labels.exitPictureInPicture,
        value: null,
        volumeLevel: null,
      };
    }
    default:
      return null;
  }
}

export function deriveAnnouncerLabel(
  event: InputActionEvent,
  snapshot: MediaSnapshot,
  labels: InputIndicatorLabels = DEFAULT_INPUT_INDICATOR_LABELS
): string | null {
  const details = deriveStatus(event, snapshot, labels);
  if (!details) return null;

  if (isVolumeIndicatorAction(event.action)) {
    return details.status === 'volume-off' ? labels.muted : `${labels.volume} ${details.value}`;
  }

  return details.label;
}

export function getVolumeLevel(volume: number): IndicatorVolumeLevel {
  if (volume <= 0) return 'off';
  return volume <= 0.5 ? 'low' : 'high';
}

export function formatVolumeValue(volume: number): string {
  return `${Math.round(clamp(volume, 0, 1) * 100)}%`;
}

export function formatCurrentTime(snapshot: MediaSnapshot): string {
  return formatTime(snapshot.currentTime ?? 0, snapshot.duration);
}

export function getStatusIndicatorDisplayValue(state: { value: string | null; label: string | null }): string {
  return state.value ?? state.label ?? '';
}

export function getVolumeIndicatorDisplayValue(state: { value: string | null }): string {
  return state.value ?? '';
}

export function getSeekIndicatorDisplayValue(state: { value: string | null; currentTime: string }): string {
  return state.value ?? state.currentTime;
}

export function getSeekToPercent(event: InputActionEvent): number | null {
  if (event.value !== undefined) return clamp(event.value, 0, 100);
  if (!event.key || event.key < '0' || event.key > '9') return null;
  return Number(event.key) * 10;
}

export function getSeekDirection(event: InputActionEvent, snapshot: MediaSnapshot): IndicatorDirection | null {
  if (event.action === 'seekStep' && event.value !== undefined) {
    if (event.value > 0) return 'forward';
    if (event.value < 0) return 'backward';
  }

  if (event.action === 'seekToPercent') {
    const percent = getSeekToPercent(event);
    if (percent === null || snapshot.duration === undefined || snapshot.duration <= 0) return null;

    const targetTime = (percent / 100) * snapshot.duration;
    const currentTime = snapshot.currentTime ?? 0;
    if (targetTime > currentTime) return 'forward';
    if (targetTime < currentTime) return 'backward';
  }

  return null;
}

export function isInputActionIncluded(
  action: string | undefined,
  actions: readonly InputAction[] | undefined
): boolean {
  if (!action) return false;
  return !actions || actions.includes(action);
}

/** Predicted mute/volume after a volume-indicator action — shared by status derivation and boundary detection. */
export interface VolumeActionPrediction {
  snapshotVolume: number;
  nextMuted: boolean;
  nextVolume: number;
}

export function predictVolumeActionOutcome(event: InputActionEvent, snapshot: MediaSnapshot): VolumeActionPrediction {
  const muted = snapshot.muted === true;
  const snapshotVolume = snapshot.volume ?? 0;

  if (event.action === 'toggleMuted') {
    return { snapshotVolume, nextMuted: !muted, nextVolume: snapshotVolume };
  }

  if (event.action === 'volumeStep') {
    const nextVolume = clamp(snapshotVolume + (event.value ?? 0), 0, 1);
    /** Mirrors `volumeFeature.setVolume`: mute clears only when the clamped volume is greater than 0. */
    const nextMuted = muted && nextVolume <= 0;
    return { snapshotVolume, nextMuted, nextVolume };
  }

  return { snapshotVolume, nextMuted: muted, nextVolume: snapshotVolume };
}

function volumePredictionToStatusDetails(
  prediction: VolumeActionPrediction,
  labels: InputIndicatorLabels
): StatusDetails {
  const level = prediction.nextMuted ? 'off' : getVolumeLevel(prediction.nextVolume);
  const value = prediction.nextMuted ? '0%' : formatVolumeValue(prediction.nextVolume);

  return {
    status: level === 'off' ? 'volume-off' : level === 'low' ? 'volume-low' : 'volume-high',
    label: level === 'off' ? labels.muted : labels.volume,
    value,
    volumeLevel: level,
  };
}

/** Labels/value/level for volume actions — single source shared with `VolumeIndicatorCore`. */
export function deriveVolumeStatus(
  event: InputActionEvent,
  snapshot: MediaSnapshot,
  labels: InputIndicatorLabels = DEFAULT_INPUT_INDICATOR_LABELS,
  cachedPrediction?: VolumeActionPrediction
): StatusDetails {
  const prediction = cachedPrediction ?? predictVolumeActionOutcome(event, snapshot);
  return volumePredictionToStatusDetails(prediction, labels);
}
