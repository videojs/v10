import { clamp } from '@videojs/utils/number';
import { formatTime } from '@videojs/utils/time';

/** Where an input action originated from. */
export type InputActionSource = 'gesture' | 'hotkey';

/** Known input action names. Accepts arbitrary strings for custom extensions. */
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

/** Direction of a seek-step indicator burst. */
export type IndicatorDirection = 'forward' | 'backward';
/** Volume bucket exposed by indicators (smaller alphabet than `MuteButtonCore.VolumeLevel`). */
export type IndicatorVolumeLevel = 'off' | 'low' | 'high';

/** Indicator status keys used to pick icons and labels. */
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

/** Event describing a single input action from a gesture or hotkey. */
export interface InputActionEvent {
  /** Action name (e.g. `'togglePaused'`). */
  action?: string | undefined;
  /** Optional numeric argument (seconds, volume delta, percent, etc.). */
  value?: number | undefined;
  /** Where the action came from. */
  source?: InputActionSource | undefined;
  /** Originating key for hotkey events. */
  key?: string | undefined;
}

/** Subset of media state used when deriving indicator labels and predictions. */
export interface MediaSnapshot {
  /** Whether the media is paused. */
  paused?: boolean | undefined;
  /** Current volume (0–1). */
  volume?: number | undefined;
  /** Whether the media is muted. */
  muted?: boolean | undefined;
  /** Whether the player is in fullscreen. */
  fullscreen?: boolean | undefined;
  /** Whether subtitles are currently showing. */
  subtitlesShowing?: boolean | undefined;
  /** Whether the media is in picture-in-picture. */
  pip?: boolean | undefined;
  /** Current playback time in seconds. */
  currentTime?: number | undefined;
  /** Total duration in seconds. */
  duration?: number | undefined;
}

/** Label strings used by status indicators and announcers. */
export interface InputIndicatorLabels {
  /** Label shown when the media is being muted. */
  muted: string;
  /** Label prefix for volume changes (e.g. `"Volume 50%"`). */
  volume: string;
  /** Label shown when captions are being enabled. */
  captionsOn: string;
  /** Label shown when captions are being disabled. */
  captionsOff: string;
  /** Label shown when the media is being paused. */
  paused: string;
  /** Label shown when the media starts playing. */
  playing: string;
  /** Label shown when entering fullscreen. */
  fullscreen: string;
  /** Label shown when exiting fullscreen. */
  exitFullscreen: string;
  /** Label shown when entering picture-in-picture. */
  pictureInPicture: string;
  /** Label shown when exiting picture-in-picture. */
  exitPictureInPicture: string;
}

/** Rich description of the status for a single action — used by indicators and announcers. */
export interface StatusDetails {
  /** Status key (drives icon selection). */
  status: IndicatorStatus;
  /** Human-readable label. */
  label: string;
  /** Optional value string (e.g. `"50%"`). */
  value: string | null;
  /** Volume bucket when the action affects volume. */
  volumeLevel: IndicatorVolumeLevel | null;
}

/** Default English labels used by status indicators and announcers. */
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

/** Whether an action is handled by the volume indicator. */
export function isVolumeIndicatorAction(action: string | null | undefined): action is 'toggleMuted' | 'volumeStep' {
  return action === 'toggleMuted' || action === 'volumeStep';
}

/** Whether an action is handled by the seek indicator. */
export function isSeekIndicatorAction(action: string | null | undefined): action is 'seekStep' | 'seekToPercent' {
  return action === 'seekStep' || action === 'seekToPercent';
}

/**
 * Derive status details for a single input action.
 *
 * @param event - The input action event.
 * @param snapshot - Current media state snapshot used to predict the post-action label.
 * @param labels - Label strings (defaults to English).
 */
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

/**
 * Derive the aria-live label announced for an input action.
 *
 * @param event - The input action event.
 * @param snapshot - Current media state snapshot used to predict the post-action label.
 * @param labels - Label strings (defaults to English).
 */
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

/**
 * Bucket a 0–1 volume into the indicator's three-level scale.
 *
 * @param volume - Volume value in `[0, 1]`.
 */
export function getVolumeLevel(volume: number): IndicatorVolumeLevel {
  if (volume <= 0) return 'off';
  return volume <= 0.5 ? 'low' : 'high';
}

/**
 * Format a 0–1 volume as a percentage string.
 *
 * @param volume - Volume value in `[0, 1]`.
 */
export function formatVolumeValue(volume: number): string {
  return `${Math.round(clamp(volume, 0, 1) * 100)}%`;
}

/**
 * Format the snapshot's current time using the duration as a hint for precision.
 *
 * @param snapshot - Media state snapshot.
 */
export function formatCurrentTime(snapshot: MediaSnapshot): string {
  return formatTime(snapshot.currentTime ?? 0, snapshot.duration);
}

/**
 * Resolve the visible string for a status indicator from its state.
 *
 * @param state - Indicator state with `value` and `label`.
 */
export function getStatusIndicatorDisplayValue(state: { value: string | null; label: string | null }): string {
  return state.value ?? state.label ?? '';
}

/**
 * Resolve the visible string for a volume indicator from its state.
 *
 * @param state - Indicator state with `value`.
 */
export function getVolumeIndicatorDisplayValue(state: { value: string | null }): string {
  return state.value ?? '';
}

/**
 * Resolve the visible string for a seek indicator from its state.
 *
 * @param state - Indicator state with `value` and `currentTime`.
 */
export function getSeekIndicatorDisplayValue(state: { value: string | null; currentTime: string }): string {
  return state.value ?? state.currentTime;
}

/**
 * Resolve the seek-to percent for a `seekToPercent` action, accepting either a numeric value or a `0`–`9` key.
 *
 * @param event - The input action event.
 */
export function getSeekToPercent(event: InputActionEvent): number | null {
  if (event.value !== undefined) return clamp(event.value, 0, 100);
  if (!event.key || event.key < '0' || event.key > '9') return null;
  return Number(event.key) * 10;
}

/**
 * Resolve the direction of a seek action.
 *
 * @param event - The input action event.
 * @param snapshot - Current media state snapshot.
 */
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

/**
 * Whether an action matches the optional include-list (matches all when omitted).
 *
 * @param action - The action name.
 * @param actions - Optional include-list of allowed action names.
 */
export function isInputActionIncluded(
  action: string | undefined,
  actions: readonly InputAction[] | undefined
): boolean {
  if (!action) return false;
  return !actions || actions.includes(action);
}

/** Predicted mute/volume after a volume-indicator action — shared by status derivation and boundary detection. */
export interface VolumeActionPrediction {
  /** Volume at the time of the snapshot. */
  snapshotVolume: number;
  /** Predicted muted state after the action. */
  nextMuted: boolean;
  /** Predicted volume after the action. */
  nextVolume: number;
}

/**
 * Predict mute/volume after applying a volume-indicator action to the snapshot.
 *
 * @param event - The input action event.
 * @param snapshot - Current media state snapshot.
 */
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
