import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import type { Renderer } from '@/stores/installation';
import { muxPlaybackId, renderer } from '@/stores/installation';

function generateUsageCode(renderer: Renderer, playbackId: string | null): string {
  const isMuxWithPlaybackId =
    (renderer === 'mux-video' || renderer === 'mux-audio' || renderer === 'mux-background-video') && playbackId;
  const playerProp = isMuxWithPlaybackId ? `playbackId="${playbackId}"` : 'src="https://example.com/video.mp4"';

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
  const $muxPlaybackId = useStore(muxPlaybackId);

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="React usage">
        <Tab value="react" initial>
          ./app/page.tsx
        </Tab>
      </TabsList>
      <TabsPanel value="react" initial>
        <ClientCode code={generateUsageCode($renderer, $muxPlaybackId)} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}
