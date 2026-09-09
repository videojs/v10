import type { MediaPlayer } from '@app/media';

/**
 * The shell's width control, in CSS pixels. The stops are the rem widths the skins' layouts change around, then the
 * end.
 */
export const PLAYER_WIDTH = {
  min: 240,
  max: 1360,
  stops: [384, 512, 672, 960, 1360],
} as const;

/** The width a preview opens at before the control is touched: the video skins' `4xl` cap or the audio skins' `xl`. */
export function defaultPlayerWidth(player: MediaPlayer): number {
  return player === 'audio' ? 576 : 896;
}

/**
 * How the React skin components frame their player: centred, and capped by the shell's width control through
 * `--sandbox-player-width`, with the skin's own cap when a page is opened without one. The html templates write the
 * plain `max-w-4xl` and `max-w-xl` classes a consumer would, and `styles.css` caps those the same way.
 */
export const PLAYER_FRAME_CLASSES = {
  // Keep centred controls on device pixels instead of the fractional height produced by aspect-ratio.
  video:
    'mx-auto aspect-video max-w-[var(--sandbox-player-width,56rem)] h-[round(nearest,calc(min(var(--sandbox-player-width,56rem),100vw-1rem)*9/16),2px)]!',
  audio: 'mx-auto w-full max-w-[var(--sandbox-player-width,36rem)]',
} as const;
