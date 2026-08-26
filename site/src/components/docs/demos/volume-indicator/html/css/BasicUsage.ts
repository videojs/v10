import '@videojs/html/video/player';
import '@videojs/html/ui/hotkey';
import '@videojs/html/ui/volume-indicator';

const video = document.querySelector<HTMLVideoElement>('.html-volume-indicator-basic video');

if (video) video.volume = 0.5;
