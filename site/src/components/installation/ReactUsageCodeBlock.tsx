import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import type { Renderer } from '@/stores/installation';
import { muxPlaybackId, renderer, sourceUrl } from '@/stores/installation';

function generateUsageCode(renderer: Renderer, playbackId: string | null, url: string): string {
  const isMuxWithPlaybackId =
    (renderer === 'mux-video' || renderer === 'mux-audio' || renderer === 'mux-background-video') && playbackId;

  let playerProp: string;
  if (isMuxWithPlaybackId) {
    playerProp = `playbackId="${playbackId}"`;
  } else if (url.trim()) {
    playerProp = `src="${url.trim()}"`;
  } else {
    playerProp = 'src="https://example.com/video.mp4"';
  }

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
  const $sourceUrl = useStore(sourceUrl);

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="React usage">
        <Tab value="react" initial>
          ./app/page.tsx
        </Tab>
      </TabsList>
      <TabsPanel value="react" initial>
        <ClientCode code={generateUsageCode($renderer, $muxPlaybackId, $sourceUrl)} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}
