import { useStore } from '@nanostores/react';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import type { Skin } from '@/stores/homePageDemos';
import { framework, skin } from '@/stores/homePageDemos';
import ClientCode from '../Code/ClientCode';

function generateHTMLCode(skin: Skin): string {
  const skinTag = skin === 'frosted' ? 'video-skin' : 'minimal-video-skin';
  const skinFile = skin === 'frosted' ? 'skin' : 'minimal-skin';

  return `<script type="module">
  import 'https://cdn.jsdelivr.net/npm/videojs/html/video/player.js';
  import 'https://cdn.jsdelivr.net/npm/videojs/html/video/${skinFile}.js';
</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/videojs/html/video/${skinFile}.css" />

<video-player>
  <${skinTag}>
    <video src="..."></video>
  </${skinTag}>
</video-player>`;
}

function generateReactCode(skin: Skin): string {
  const skinComponent = skin === 'frosted' ? 'VideoSkin' : 'MinimalVideoSkin';
  const skinCss = skin === 'frosted' ? 'skin' : 'minimal-skin';

  return `import { createPlayer, features, Poster } from '@videojs/react';
import { ${skinComponent}, Video } from '@videojs/react/video';
import '@videojs/react/video/${skinCss}.css';

const Player = createPlayer({ features: [...features.video] });

export function VideoPlayer() {
  return (
    <Player.Provider>
      <${skinComponent}>
        <Video src="..." playsInline />
        <Poster src="..." />
      </${skinComponent}>
    </Player.Provider>
  );
}`;
}

export default function BaseDemo({ className }: { className?: string }) {
  const $framework = useStore(framework);
  const $skin = useStore(skin);

  if ($framework === 'html') {
    return (
      <TabsRoot key={$framework} className={className} maxWidth={false}>
        <TabsList label="HTML implementation">
          <Tab value="html" initial>
            HTML
          </Tab>
        </TabsList>
        <TabsPanel value="html" initial>
          <ClientCode code={generateHTMLCode($skin)} lang="html" />
        </TabsPanel>
      </TabsRoot>
    );
  }

  return (
    <TabsRoot key={$framework} className={className} maxWidth={false}>
      <TabsList label="React implementation">
        <Tab value="react" initial>
          React
        </Tab>
      </TabsList>
      <TabsPanel value="react" initial>
        <ClientCode code={generateReactCode($skin)} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}
