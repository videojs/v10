import '@videojs/html/video/player';
import '@videojs/html/video/skin';
import { MEDIA } from './shared';

const html = String.raw;

// Inline WebVTT as a data URL so captions are available from page load
const captionVtt = encodeURIComponent('WEBVTT\n\n00:00:00.000 --> 00:00:30.000\nThis is a test caption');

document.getElementById('root')!.innerHTML = html`
  <video-player>
    <video-skin style="max-width: 800px; aspect-ratio: 16/9">
      <video src="${MEDIA.mp4.url}" playsinline crossorigin="anonymous">
        <track kind="metadata" label="thumbnails" src="${MEDIA.mp4.storyboard}" default />
        <track kind="subtitles" label="English" srclang="en" src="data:text/vtt,${captionVtt}" />
      </video>
      <img slot="poster" src="${MEDIA.mp4.poster}" alt="Video poster" />
    </video-skin>
  </video-player>
`;
