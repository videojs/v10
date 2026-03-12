import { useStore } from '@nanostores/react';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { VJS10_DEMO_VIDEO } from '@/consts';
import type { Skin } from '@/stores/homePageDemos';
import { framework, skin } from '@/stores/homePageDemos';
import ClientCode from '../../Code/ClientCode';

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@videojs/html/cdn';

function generateHTMLCode(skin: Skin): string {
  const skinTag = skin === 'default' ? 'video-skin' : 'video-minimal-skin';
  const cdnFile = skin === 'default' ? 'video' : 'video-minimal';

  return `<script type="module" src="${CDN_BASE}/${cdnFile}.js"></script>
<link rel="stylesheet" href="${CDN_BASE}/${cdnFile}.css" />

<video-player>
  <${skinTag}>
    <video slot="media" src="${VJS10_DEMO_VIDEO.mp4}" playsinline></video>
  </${skinTag}>
</video-player>`;
}

function generateReactCode(skin: Skin): string {
  const skinComponent = skin === 'default' ? 'VideoSkin' : 'MinimalVideoSkin';
  const skinCss = skin === 'default' ? 'skin' : 'minimal-skin';

  return `import { createPlayer, Poster } from '@videojs/react';
import { ${skinComponent}, Video, videoFeatures } from '@videojs/react/video';
import '@videojs/react/video/${skinCss}.css';

const Player = createPlayer({ features: videoFeatures });

export function VideoPlayer() {
  return (
    <Player.Provider>
      <${skinComponent}>
        <Video src="${VJS10_DEMO_VIDEO.mp4}" playsInline />
        <Poster src="${VJS10_DEMO_VIDEO.poster}" />
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
