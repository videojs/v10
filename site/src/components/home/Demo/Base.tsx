import { useStore } from '@nanostores/react';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import type { Skin } from '@/stores/homePageDemos';
import { framework, skin } from '@/stores/homePageDemos';
import ClientCode from '../../Code/ClientCode';

function generateHTMLCode(skin: Skin): string {
  const skinTag = skin === 'frosted' ? 'video-skin' : 'video-minimal-skin';
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

  return `import { createPlayer, Poster } from '@videojs/react';
import { ${skinComponent}, Video, videoFeatures } from '@videojs/react/video';
import '@videojs/react/video/${skinCss}.css';

const Player = createPlayer({ features: [...videoFeatures] });

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
      <TabsRoot variant="expanded" key={$framework} className={className} maxWidth={false}>
        <TabsList variant="expanded" label="HTML implementation">
          <Tab variant="expanded" value="html" initial>
            HTML
          </Tab>
        </TabsList>
        <TabsPanel variant="expanded" value="html" initial className="bg-faded-black dark:bg-soot m-2.5 mt-0">
          <ClientCode code={generateHTMLCode($skin)} lang="html" />
        </TabsPanel>
      </TabsRoot>
    );
  }

  return (
    <TabsRoot variant="expanded" key={$framework} className={className} maxWidth={false}>
      <TabsList variant="expanded" label="React implementation">
        <Tab variant="expanded" value="react" initial>
          React
        </Tab>
      </TabsList>
      <TabsPanel variant="expanded" value="react" initial className="bg-faded-black dark:bg-soot m-2.5 mt-0">
        <ClientCode code={generateReactCode($skin)} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}
