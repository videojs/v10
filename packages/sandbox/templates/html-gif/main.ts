// HTML GIF sandbox — animated GIF renderer demo with custom elements
// http://localhost:5173/html-gif/

import { playbackFeature } from '@videojs/core/dom';
import { createPlayer, PlayButtonElement } from '@videojs/html';
import { GifMediaElement } from '../gif-media/html';

const { PlayerElement } = createPlayer({ features: [playbackFeature] });

customElements.define('video-player', PlayerElement);
customElements.define(GifMediaElement.tagName, GifMediaElement);
customElements.define(PlayButtonElement.tagName, PlayButtonElement);

// A publicly accessible animated GIF for demo purposes
const GIF_SRC =
  'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzlsaW43OHN5ZnJmdmV0cGtvY3p3a3BtejhwZGMxZGdqOGhkejAzdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oriO0OEd9QIDdllqo/giphy.gif';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:32px;font-family:monospace">
    <h1 style="font-size:20px">HTML GIF Demo</h1>
    <video-player style="position:relative;display:inline-block">
      <gif-media src="${GIF_SRC}" style="display:block;width:480px;height:270px"></gif-media>
      <div style="position:absolute;bottom:8px;left:8px">
        <media-play-button></media-play-button>
      </div>
    </video-player>
  </div>
`;
