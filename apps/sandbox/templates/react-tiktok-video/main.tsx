import '@app/styles.css';
import { VideoPlayer } from '@app/shared/react/players';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useSandbox } from '@app/shared/react/use-sandbox';
import { TIKTOK_VIDEO_SRC } from '@app/shared/sources';
import { TikTokVideo } from '@videojs/react/media/tiktok-video';
import { createRoot } from 'react-dom/client';

function App() {
  const { skin, styling } = useSandbox();

  return (
    <VideoPlayer>
      <VideoSkinComponent skin={skin} styling={styling} className="mx-auto aspect-video max-w-4xl">
        <TikTokVideo className="block h-full w-full" src={TIKTOK_VIDEO_SRC} playsInline />
      </VideoSkinComponent>
    </VideoPlayer>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
