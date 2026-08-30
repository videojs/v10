import '@videojs/html/video/player';
import '@videojs/html/media/hlsjs-video';
import skin from '@/components/videojs/skins/video/skin.html?raw';
import '@/components/videojs/skins/video/skin';

import './style.css';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Could not find the application root.');

root.innerHTML = `<video-player>${skin.replace(
  '<!-- Add a compatible media element here. -->',
  '<hlsjs-video aria-label="Registry validation video"></hlsjs-video>'
)}</video-player>`;
