/**
 * CDN bundle test page — HLS.
 *
 * Imports the CDN video bundle + HLS media plugin. Uses a different HLS
 * source (Elephants Dream) for media variety.
 */

import '@videojs/html/cdn/video';
import '@videojs/html/cdn/media/hls-video';
import { MEDIA } from './shared';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <video-player>
    <video-skin style="max-width: 800px; aspect-ratio: 16/9">
      <hls-video src="${MEDIA.hls2.url}" playsinline crossorigin="anonymous">
        <track kind="metadata" label="thumbnails" src="${MEDIA.hls2.storyboard}" default />
      </hls-video>
      <img slot="poster" src="${MEDIA.hls2.poster}" alt="Video poster" />
    </video-skin>
  </video-player>
`;
