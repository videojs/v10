import { VJS10_DEMO_VIDEO } from '@/consts';
import type { Skin } from '@/stores/homePageDemos';

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@videojs/html/cdn';

export function generateHTMLCode(skin: Skin): string {
  const skinTag = skin === 'default' ? 'video-skin' : 'video-minimal-skin';
  const cdnFile = skin === 'default' ? 'video' : 'video-minimal';

  return `<script type="module" src="${CDN_BASE}/${cdnFile}.js"></script>

<video-player>
  <${skinTag}>
    <video src="${VJS10_DEMO_VIDEO.mp4}" playsinline></video>
  </${skinTag}>
</video-player>`;
}

export function generateReactCode(skin: Skin): string {
  const skinComponent = skin === 'default' ? 'VideoSkin' : 'MinimalVideoSkin';
  const skinCss = skin === 'default' ? 'skin' : 'minimal-skin';

  return `import { createPlayer } from '@videojs/react';
import { ${skinComponent}, Video, videoFeatures } from '@videojs/react/video';
import '@videojs/react/video/${skinCss}.css';

const Player = createPlayer({ features: videoFeatures });

export function VideoPlayer() {
  return (
    <Player.Provider>
      <${skinComponent} poster={VJS10_DEMO_VIDEO.poster}>
        <Video src="${VJS10_DEMO_VIDEO.mp4}" playsInline />
      </${skinComponent}>
    </Player.Provider>
  );
}`;
}
