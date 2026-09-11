import type { PlayerStyleTheme } from './config';

/**
 * Every player.style theme the sandbox has a port for, with the published version each reference frame pins.
 *
 * Versions are the ones on npm at the time a theme was ported; bumping one changes what the comparison compares
 * against, so it is a deliberate edit rather than a range.
 */
export const PLAYER_STYLE_THEMES = {
  'demuxed-2022': { name: 'demuxed-2022', label: 'Demuxed 2022', player: 'video', version: '0.1.2' },
  halloween: { name: 'halloween', label: 'Halloween', player: 'video', version: '0.1.2' },
  instaplay: { name: 'instaplay', label: 'Instaplay', player: 'video', version: '0.1.2' },
  microvideo: { name: 'microvideo', label: 'Microvideo', player: 'video', version: '0.2.0' },
  minimal: { name: 'minimal', label: 'Minimal', player: 'video', version: '0.2.1' },
  notflix: { name: 'notflix', label: 'Notflix', player: 'video', version: '0.1.2' },
  reelplay: { name: 'reelplay', label: 'Reelplay', player: 'video', version: '0.1.2' },
  sutro: { name: 'sutro', label: 'Sutro', player: 'video', version: '0.2.1' },
  'sutro-audio': { name: 'sutro-audio', label: 'Sutro Audio', player: 'audio', version: '0.0.8' },
  'tailwind-audio': { name: 'tailwind-audio', label: 'Tailwind Audio', player: 'audio', version: '0.0.13' },
  vimeonova: { name: 'vimeonova', label: 'Vimeonova', player: 'video', version: '0.1.2' },
  winamp: { name: 'winamp', label: 'Winamp', player: 'video', version: '0.0.13' },
  'x-mas': { name: 'x-mas', label: 'X-mas', player: 'video', version: '0.1.2' },
  yt: { name: 'yt', label: 'YT', player: 'video', version: '0.2.1' },
} as const satisfies Record<string, PlayerStyleTheme>;

export type PlayerStyleThemeName = keyof typeof PLAYER_STYLE_THEMES;

/** Themes with a port checked in, in the order the index lists them. */
export const PORTED_THEMES: readonly PlayerStyleThemeName[] = [
  'demuxed-2022',
  'halloween',
  'instaplay',
  'notflix',
  'reelplay',
  'sutro',
  'sutro-audio',
  'tailwind-audio',
  'vimeonova',
  'winamp',
  'x-mas',
];
