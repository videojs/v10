/** @internal */
export type InputActionSource = 'gesture' | 'hotkey';

/** @internal */
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

/** @internal */
export interface InputActionEvent {
  action?: string | undefined;
  value?: number | undefined;
  source?: InputActionSource | undefined;
  key?: string | undefined;
  repeat?: boolean | undefined;
}

/** @internal */
export interface MediaSnapshot {
  paused?: boolean | undefined;
  volume?: number | undefined;
  muted?: boolean | undefined;
  playbackRate?: number | undefined;
  isFullscreen?: boolean | undefined;
  subtitlesShowing?: boolean | undefined;
  /** When false, caption toggles are unavailable and status feedback is suppressed. */
  subtitlesAvailable?: boolean | undefined;
  isPictureInPicture?: boolean | undefined;
  currentTime?: number | undefined;
  duration?: number | undefined;
  seeking?: boolean | undefined;
}

/** @internal */
export function isInputActionIncluded(
  action: string | undefined,
  actions: readonly InputAction[] | undefined
): boolean {
  if (!action) return false;

  return !actions || actions.includes(action);
}
