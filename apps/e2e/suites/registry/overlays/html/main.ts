import '@videojs/html/video/player';
import '@videojs/html/media/hlsjs-video';
import minimalSkin from '@/components/videojs/skins/video/minimal/skin.html?raw';
import '@/components/videojs/skins/video/minimal/skin';
import defaultSkin from '@/components/videojs/skins/video/skin.html?raw';
import '@/components/videojs/skins/video/skin';

import './style.css';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Could not find the application root.');

const skins = [
  { name: 'default', template: defaultSkin },
  { name: 'minimal', template: minimalSkin },
];

root.innerHTML = skins
  .map(
    ({ name, template }) =>
      `<video-player data-registry-skin="${name}">${template.replace(
        '<!-- Add a compatible media element here. -->',
        `<hlsjs-video aria-label="${name} registry validation video"></hlsjs-video>`
      )}</video-player>`
  )
  .join('');
