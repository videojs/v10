export type HotkeyActionName =
  | 'togglePaused'
  | 'toggleMuted'
  | 'toggleFullscreen'
  | 'toggleSubtitles'
  | 'togglePictureInPicture'
  | 'seekStep'
  | 'volumeStep'
  | 'speedUp'
  | 'speedDown'
  | 'seekToPercent';

export interface HotkeyProps {
  /** Key pattern to match, such as `Space`, `ArrowRight`, or `Mod+k`. */
  keys: string;
  /** Player action to run when the key pattern matches. */
  action: HotkeyActionName;
  /** Numeric value passed to actions such as `seekStep`, `volumeStep`, and `seekToPercent`. */
  value?: number | undefined;
  /** Whether the hotkey is disabled. */
  disabled?: boolean | undefined;
  /** Whether to listen on the player container or the document. */
  target?: 'player' | 'document' | undefined;
}
