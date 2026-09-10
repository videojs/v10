/**
 * Three modes on one page. Without `panel` the page is the comparison shell; with it the page is a single player, which
 * is what each of the shell's frames loads.
 *
 * The split matters: media-chrome and `@videojs/html` register eleven of the same custom element names, and whichever
 * loads first silently wins. Keeping each stack in its own module _and_ its own frame is what makes the two renderable
 * at the same time.
 *
 * Every import here is dynamic for that reason, which leaves nothing to mark the file a module — hence the bare `export
 * {}`, without which top-level `await` is a type error.
 */
export {};

const panel = new URLSearchParams(location.search).get('panel');

if (panel === 'media-chrome') {
  await import('./panel-media-chrome');
} else if (panel === 'videojs') {
  await import('./panel-videojs');
} else {
  await import('./compare');
}
