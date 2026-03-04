import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { renderer, sourceUrl } from '@/stores/installation';

function generateUsageCode(url: string): string {
  const playerProp = url.trim() ? `src="${url.trim()}"` : 'src="https://example.com/video.mp4"';

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
  useStore(renderer);
  const $sourceUrl = useStore(sourceUrl);

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="React usage">
        <Tab value="react" initial>
          ./app/page.tsx
        </Tab>
      </TabsList>
      <TabsPanel value="react" initial>
        <ClientCode code={generateUsageCode($sourceUrl)} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}
