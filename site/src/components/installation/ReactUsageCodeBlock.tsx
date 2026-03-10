import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { VJS10_DEMO_VIDEO } from '@/consts';
import type { Renderer } from '@/stores/installation';
import { renderer, sourceUrl } from '@/stores/installation';

function getDefaultSourceUrl(renderer: Renderer): string {
  return renderer === 'hls' ? VJS10_DEMO_VIDEO.hls : VJS10_DEMO_VIDEO.mp4;
}

function generateUsageCode(url: string, renderer: Renderer): string {
  const source = url.trim() || getDefaultSourceUrl(renderer);
  const playerProp = `src="${source}"`;

  return `import { MyPlayer } from '../components/player';

export const HomePage = () => {
  return (
    <div>
      <h1>Welcome to My App</h1>
      <MyPlayer ${playerProp} />
    </div>
  );
};`;
}

export default function ReactUsageCodeBlock() {
  const $renderer = useStore(renderer);
  const $sourceUrl = useStore(sourceUrl);

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="React usage">
        <Tab value="react" initial>
          ./app/page.tsx
        </Tab>
      </TabsList>
      <TabsPanel value="react" initial>
        <ClientCode code={generateUsageCode($sourceUrl, $renderer)} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}
