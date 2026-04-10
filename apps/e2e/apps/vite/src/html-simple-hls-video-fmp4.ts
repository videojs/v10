/**
 * simple-hls-video test page — SPF-based HLS with fMP4/CMAF segments.
 *
 * preload="metadata" is required so SPF resolves the manifest before
 * playback. Without it, SPF's resolve-presentation gate stays in 'idle'
 * (it only resolves when preload is 'auto'/'metadata' or playbackInitiated
 * is true), which means no manifest fetch, no duration, and no seek support.
 *
 * Even with preload="metadata", SPF currently can't complete seeks before
 * playback has begun — the 'seeking' event fires but 'seeked' never does
 * because no segment data is buffered at the target position. This is a
 * known limitation that should eventually be addressed.
 */

import '@videojs/html/video/player';
import '@videojs/html/video/skin';
import '@videojs/html/media/simple-hls-video';
import { MEDIA } from './shared';

const html = String.raw;

document.getElementById('root')!.innerHTML = html`
  <video-player>
    <video-skin style="max-width: 800px; aspect-ratio: 16/9">
      <simple-hls-video src="${MEDIA.hlsFmp4.url}" playsinline crossorigin="anonymous" preload="metadata">
        <track kind="metadata" label="thumbnails" src="${MEDIA.hlsFmp4.storyboard}" default />
      </simple-hls-video>
      <img slot="poster" src="${MEDIA.hlsFmp4.poster}" alt="Video poster" />
    </video-skin>
  </video-player>
`;
