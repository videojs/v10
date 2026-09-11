import { applyThemeDefaults, type PlayerStyleTheme } from './config';

/**
 * Three modes on one route. Without `panel` the page is the comparison shell; with it the page is a single player,
 * which is what each of the shell's frames loads.
 *
 * The split matters: media-chrome and `@videojs/html` register eleven of the same custom element names, and whichever
 * loads first silently wins. Keeping each stack in its own module _and_ its own frame is what makes the two renderable
 * at the same time — so the ported panel is passed in as a dynamic import rather than imported here.
 */
export async function routePlayerStyleSandbox(theme: PlayerStyleTheme, ported: () => Promise<unknown>): Promise<void> {
  const params = new URLSearchParams(location.search);
  const panel = params.get('panel');

  // The shell writes the theme's source default into the frame URLs it builds. A panel opened on its own carries only
  // what the URL says, so it defaults here too rather than falling back to the sandbox's on-demand source.
  if (panel !== null && applyThemeDefaults(params, theme)) history.replaceState(null, '', `?${params}`);

  if (panel === 'media-chrome') {
    const { mountOriginalPanel } = await import('./panel-media-chrome');

    await mountOriginalPanel(theme);

    return;
  }

  if (panel === 'videojs') {
    // A React port stands in for the hand-written one when asked for; the reference frame is unaffected either way.
    if (params.get('impl') === 'react') {
      const { hasReactSkin, mountReactPanel } = await import('./panel-react');

      if (hasReactSkin(theme.name)) {
        mountReactPanel(theme);

        return;
      }
    }

    await ported();

    return;
  }

  const { mountCompare } = await import('./compare');

  mountCompare(theme);
}
