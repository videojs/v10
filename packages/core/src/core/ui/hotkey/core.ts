import type { InputAction } from '../input-action/input-action';

export interface HotkeyProps {
  /** Key pattern to match, such as `Space`, `ArrowRight`, or `Mod+k`. */
  keys: string;
  /**
   * Player action to run when the key pattern matches. Built-in actions are `togglePaused`, `toggleMuted`,
   * `toggleFullscreen`, `toggleSubtitles`, `togglePictureInPicture`, `seekStep`, `seekToPercent`, `volumeStep`,
   * `speedUp`, and `speedDown`.
   */
  action: InputAction;
  /** Numeric value passed to actions such as `seekStep`, `volumeStep`, and `seekToPercent`. */
  value?: number | undefined;
  /** Whether the hotkey is disabled. */
  disabled?: boolean | undefined;
  /** Whether to listen on the player container or the document. */
  target?: 'player' | 'document' | undefined;
}
