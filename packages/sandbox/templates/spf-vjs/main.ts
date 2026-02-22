// SPF + Video.js integration sandbox
// http://localhost:5173/spf-vjs/
//
// Smoke test: SPF as the media element inside a VJS player with UI controls.
// Validates play/pause and mute via VJS buttons wired to the SPF engine.
//
// Icon visibility is driven by data-* attributes set by the button elements:
//   media-play-button: [data-paused], [data-ended]
//   media-mute-button: [data-muted]

import { createPlayer, features } from '@videojs/html';
import '@videojs/html/media/spf-video';
import '@videojs/html/ui/play-button';
import '@videojs/html/ui/mute-button';
import { pauseIcon, playIcon, restartIcon, volumeHighIcon, volumeOffIcon } from '@videojs/icons/html';

const { PlayerElement } = createPlayer({
  features: features.video,
});

customElements.define('video-player', PlayerElement);

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <style>
    video-player {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #111;
      color: white;
      width: fit-content;
    }

    spf-video {
      width: 480px;
      aspect-ratio: 16 / 9;
      display: block;
      background: black;
    }

    media-play-button,
    media-mute-button {
      cursor: pointer;
      background: none;
      border: none;
      color: white;
      display: flex;
      align-items: center;
      padding: 4px;
    }

    /* Play button icon states */
    media-play-button .icon-play,
    media-play-button .icon-pause,
    media-play-button .icon-restart { display: none; }

    media-play-button[data-paused]:not([data-ended]) .icon-play        { display: block; }
    media-play-button:not([data-paused]):not([data-ended]) .icon-pause  { display: block; }
    media-play-button[data-ended] .icon-restart                        { display: block; }

    /* Mute button icon states */
    media-mute-button .icon-volume-high,
    media-mute-button .icon-volume-off { display: none; }

    media-mute-button:not([data-muted]) .icon-volume-high { display: block; }
    media-mute-button[data-muted]       .icon-volume-off  { display: block; }
  </style>

  <video-player>
    <spf-video
      src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8"
      preload="auto"
      playsinline
    ></spf-video>

    <media-play-button>
      <span class="icon-play">${playIcon}</span>
      <span class="icon-pause">${pauseIcon}</span>
      <span class="icon-restart">${restartIcon}</span>
    </media-play-button>

    <media-mute-button>
      <span class="icon-volume-high">${volumeHighIcon}</span>
      <span class="icon-volume-off">${volumeOffIcon}</span>
    </media-mute-button>
  </video-player>
`;
