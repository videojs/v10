import '@app/styles.css';
import { defineTemplateSkin } from '@app/shared/html/registry-skins';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

import { type PlayerStyleTheme, portedTagName } from './config';

/** The frame around a player, matching what the stock sandbox templates use. */
export function frameClasses({ player }: PlayerStyleTheme): string {
  return player === 'audio' ? 'mx-auto w-full max-w-xl' : 'mx-auto aspect-video w-full max-w-4xl';
}

/**
 * Mount the ported theme.
 *
 * The theme is markup plus a stylesheet, stamped into an element the same way an ejected registry skin is: the authored
 * markup keeps a bare `<slot>` where the media goes and the poster's own `<img>` as its target. The page names its own
 * tag rather than the shell's `skinTag`, since the shell's picker only knows the packaged skins.
 */
export function mountPortedPanel(theme: PlayerStyleTheme, markup: string): void {
  const skinTag = defineTemplateSkin(portedTagName(theme), {
    markup,
    media: (container) => container.querySelector('slot:not([name])'),
    /*
     * Video themes wrap the image in `media-poster`; audio themes place it themselves behind a named slot. Accept
     * either, or the slotted image is dropped and the artwork never appears.
     */
    poster: (container) =>
      container.querySelector('media-poster img') ?? container.querySelector('slot[name="poster"]'),
  });

  // A live port needs a media element that can actually play HLS, or stream type never resolves and the live
  // controls stay inert. The player tag comes from the harness, which already swaps in the live preset.
  const mediaTag = theme.live ? 'hls-video' : theme.player === 'audio' ? 'audio' : 'video';

  createHtmlSandbox({
    player: theme.player,
    live: theme.live === true,
    render: ({ playerTag, src, attrs, chapters, storyboard, poster }) => html`
      <${playerTag}>
        <${skinTag} class="${frameClasses(theme)}">
          <${mediaTag}${src} ${attrs} playsinline crossorigin>
            ${chapters}
            ${storyboard}
          </${mediaTag}>
          ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" crossorigin />` : ''}
        </${skinTag}>
      </${playerTag}>
    `,
  });
}
