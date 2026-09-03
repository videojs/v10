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
 * How a preview frames its player: centred, and capped by the shell's width control through `--sandbox-player-width`,
 * with the skin's own cap when a page is opened without one.
 */
export const PLAYER_FRAME_CLASSES = {
  video: 'mx-auto aspect-video max-w-[var(--sandbox-player-width,56rem)]',
  audio: 'mx-auto w-full max-w-[var(--sandbox-player-width,36rem)]',
} as const;
