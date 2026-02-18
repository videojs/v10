import { useStore } from '@nanostores/react';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import type { Skin } from '@/stores/homePageDemos';
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

  return `// npm install @videojs/react-preview
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
  return `// npm install @videojs/html-preview
import '@videojs/html-preview/skins/${skin}';`;
}

export default function BaseDemo({ className }: { className?: string }) {
  const $framework = useStore(framework);
  const $skin = useStore(skin);

  const tabCodeContent = 'bg-faded-black scrollbar-white m-1 mt-0';

  if ($framework === 'html') {
    return (
      <TabsRoot key={$framework} className={className} maxWidth={false}>
        <TabsList label="HTML implementation">
          <Tab value="html" initial>
            HTML
          </Tab>
          <Tab value="javascript">
            <span className="sm:hidden">JS</span>
            <span className="hidden sm:inline">JavaScript</span>
          </Tab>
        </TabsList>
        <TabsPanel value="html" initial className={tabCodeContent}>
          <ClientCode code={generateHTMLCode($skin)} lang="html" />
        </TabsPanel>
        <TabsPanel value="javascript" className={tabCodeContent}>
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
      <TabsPanel value="react" initial className={tabCodeContent}>
        <ClientCode code={generateReactCode($skin)} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}
