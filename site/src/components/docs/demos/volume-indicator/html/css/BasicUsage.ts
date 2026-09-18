import '@videojs/html/video/player';
import '@videojs/html/ui/container';
import '@videojs/html/ui/hotkey';
import '@videojs/html/ui/volume-indicator';
import '@videojs/html/ui/volume-indicator-fill';
import '@videojs/html/ui/volume-indicator-value';

const initializedVideos = new WeakSet<HTMLVideoElement>();

function initializeDemos(): void {
  document.querySelectorAll<HTMLVideoElement>('.html-volume-indicator-basic video').forEach((video) => {
    if (initializedVideos.has(video)) return;

    initializedVideos.add(video);
    video.volume = 0.5;
  });
}

initializeDemos();
document.addEventListener('astro:page-load', initializeDemos);
