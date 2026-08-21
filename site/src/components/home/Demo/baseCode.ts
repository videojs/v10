import { VJS10_DEMO_VIDEO, VJS10_HTML_CDN_BASE } from '@/consts';
import type { Skin } from '@/stores/homePageDemos';

export function generateHTMLCode(skin: Skin): string {
  const skinTag = skin === 'default' ? 'video-skin' : 'video-minimal-skin';
  const cdnFile = skin === 'default' ? 'video' : 'video-minimal';

  return `<script type="module" src="${VJS10_HTML_CDN_BASE}/${cdnFile}.js"></script>

<video-player>
  <${skinTag}>
    <video src="${VJS10_DEMO_VIDEO.mp4}" playsinline></video>
  </${skinTag}>
</video-player>`;
}

export function generateReactCode(skin: Skin): string {
  const skinComponent = skin === 'default' ? 'VideoSkin' : 'MinimalVideoSkin';
  const skinCss = skin === 'default' ? 'skin' : 'minimal-skin';

  return `import { VideoPlayer, ${skinComponent}, Video } from '@videojs/react/video';
import '@videojs/react/video/${skinCss}.css';

export function App() {
  return (
    <VideoPlayer poster="${VJS10_DEMO_VIDEO.poster}">
      <${skinComponent}>
        <Video src="${VJS10_DEMO_VIDEO.mp4}" playsInline />
      </${skinComponent}>
    </VideoPlayer>
  );
}`;
}
