// SPF + Video.js integration sandbox
// http://localhost:5173/spf-vjs/
//
// Tests SPF fully integrated into a VJS player with UI controls.
// <spf-video> is discovered by ContainerMixin via [data-media-element].
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
    .player-wrapper {
      display: inline-flex;
      flex-direction: column;
      background: #000;
      border-radius: 6px;
      overflow: hidden;
    }

    video-player {
      display: contents;
    }

    spf-video {
      width: 640px;
      aspect-ratio: 16 / 9;
      display: block;
    }

    .control-bar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 8px;
      background: #1a1a1a;
      color: white;
    }

    media-play-button,
    media-mute-button {
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

    media-play-button:hover,
    media-mute-button:hover {
      background: rgba(255, 255, 255, 0.1);
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

  <div class="player-wrapper">
    <video-player>
      <spf-video
        src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8"
        preload="auto"
        playsinline
      ></spf-video>

      <div class="control-bar">
        <media-play-button>
          <span class="icon-play">${playIcon}</span>
          <span class="icon-pause">${pauseIcon}</span>
          <span class="icon-restart">${restartIcon}</span>
        </media-play-button>

        <media-mute-button>
          <span class="icon-volume-high">${volumeHighIcon}</span>
          <span class="icon-volume-off">${volumeOffIcon}</span>
        </media-mute-button>
      </div>
    </video-player>
  </div>
`;
