import type { PlayerStyleTheme } from './config';

/**
 * Three modes on one route. Without `panel` the page is the comparison shell; with it the page is a single player,
 * which is what each of the shell's frames loads.
 *
 * The split matters: media-chrome and `@videojs/html` register eleven of the same custom element names, and whichever
 * loads first silently wins. Keeping each stack in its own module _and_ its own frame is what makes the two renderable
 * at the same time — so the ported panel is passed in as a dynamic import rather than imported here.
 */
export async function routePlayerStyleSandbox(theme: PlayerStyleTheme, ported: () => Promise<unknown>): Promise<void> {
  const panel = new URLSearchParams(location.search).get('panel');

  if (panel === 'media-chrome') {
    const { mountOriginalPanel } = await import('./panel-media-chrome');

    await mountOriginalPanel(theme);

    return;
  }

  if (panel === 'videojs') {
    await ported();

    return;
  }

  const { mountCompare } = await import('./compare');

  mountCompare(theme);
}
