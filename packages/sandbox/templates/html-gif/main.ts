// HTML GIF sandbox — animated GIF renderer demo with custom elements
// http://localhost:5173/html-gif/

import { playbackFeature } from '@videojs/core/dom';
import { createPlayer, MediaElement, PlayButtonElement } from '@videojs/html';
import { pauseIcon, playIcon, restartIcon } from '@videojs/icons/html';
import { GifMediaElement } from '../gif-media/html';

const { ProviderMixin, ContainerMixin } = createPlayer({ features: [playbackFeature] });

class VideoPlayerElement extends ProviderMixin(ContainerMixin(MediaElement)) {}

customElements.define('video-player', VideoPlayerElement);
customElements.define(GifMediaElement.tagName, GifMediaElement);
customElements.define(PlayButtonElement.tagName, PlayButtonElement);

// A publicly accessible animated GIF for demo purposes
const GIF_SRC = 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/animated.gif';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <style>
    body { font-family: monospace; }

    .demo-layout {
      display: flex;
      gap: 32px;
      align-items: flex-start;
      padding: 32px;
    }

    .demo-col {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .demo-label {
      margin: 0;
      font-size: 13px;
      color: #555;
    }

    .player-wrapper {
      display: inline-flex;
      flex-direction: column;
      background: #000;
      border-radius: 6px;
      overflow: hidden;
    }

    video-player { display: contents; }

    gif-video {
      display: block;
      width: 480px;
    }

    .control-bar {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      background: #1a1a1a;
    }

    media-play-button {
      cursor: pointer;
      background: none;
      border: none;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 4px;
    }

    media-play-button:hover { background: rgba(255,255,255,0.1); }

    /* Icon visibility driven by data-* attributes set by PlayButtonElement */
    media-play-button .icon-play,
    media-play-button .icon-pause,
    media-play-button .icon-restart { display: none; }

    media-play-button[data-paused]:not([data-ended]) .icon-play       { display: block; }
    media-play-button:not([data-paused]):not([data-ended]) .icon-pause { display: block; }
    media-play-button[data-ended] .icon-restart                       { display: block; }

    .comparison-img {
      display: block;
      width: 480px;
      border-radius: 6px;
    }
  </style>

  <div style="padding:32px 32px 0;font-family:monospace">
    <h1 style="font-size:20px;margin:0 0 24px">HTML GIF Demo</h1>
  </div>

  <div class="demo-layout">
    <!-- GifMedia renderer with play/pause control -->
    <div class="demo-col">
      <p class="demo-label">GifMedia (canvas + playbackFeature)</p>
      <div class="player-wrapper">
        <video-player>
          <gif-video src="${GIF_SRC}"></gif-video>
          <div class="control-bar">
            <media-play-button>
              <span class="icon-play">${playIcon}</span>
              <span class="icon-pause">${pauseIcon}</span>
              <span class="icon-restart">${restartIcon}</span>
            </media-play-button>
          </div>
        </video-player>
      </div>
    </div>

    <!-- Native img for comparison -->
    <div class="demo-col">
      <p class="demo-label">Native &lt;img&gt; (always playing)</p>
      <img src="${GIF_SRC}" class="comparison-img" alt="Animated GIF" />
    </div>
  </div>
`;
