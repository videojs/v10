import type { Skin } from '@/stores/homePageDemos';
import { useStore } from '@nanostores/react';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { framework, skin } from '@/stores/homePageDemos';
import ClientCode from '../Code/ClientCode';

function generateHTMLCode(skin: Skin): string {
  const skinTag = `${skin}-skin`;

  return `<video-provider>
  <${skinTag}>
    <video src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"></video>
  </${skinTag}>
</video-provider>`;
}

function generateReactCode(skin: Skin): string {
  const skinComponent = skin === 'frosted' ? 'FrostedSkin' : 'MinimalSkin';
  const skinImport = skin === 'frosted' ? 'frosted' : 'minimal';

  return `// npm install @videojs/react@next
import { VideoProvider, ${skinComponent}, Video } from '@videojs/react-preview';
import '@videojs/react-preview/skins/${skinImport}.css';

export const VideoPlayer = () => {
  return (
    <VideoProvider>
      <${skinComponent}>
        <Video src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4" />
      </${skinComponent}>
    </VideoProvider>
  );
};`;
}

function generateJS(skin: Skin): string {
  return `// npm install @videojs/html@next
import '@videojs/html-preview/skins/${skin}';`;
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
          <Tab value="javascript">JavaScript</Tab>
        </TabsList>
        <TabsPanel value="html" initial>
          <ClientCode code={generateHTMLCode($skin)} lang="html" />
        </TabsPanel>
        <TabsPanel value="javascript">
          <ClientCode code={generateJS($skin)} lang="javascript" />
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
