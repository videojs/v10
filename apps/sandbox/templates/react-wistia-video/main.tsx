import '@app/styles.css';
import { VideoPlayer } from '@app/shared/react/players';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useSandbox } from '@app/shared/react/use-sandbox';
import { WISTIA_VIDEO_SRC } from '@app/shared/sources';
import { WistiaVideo } from '@videojs/react/media/wistia-video';
import { createRoot } from 'react-dom/client';

function App() {
  const { skin, styling } = useSandbox();

  return (
    <VideoPlayer>
      <VideoSkinComponent skin={skin} styling={styling} className="mx-auto aspect-video max-w-4xl">
        <WistiaVideo className="block h-full w-full" src={WISTIA_VIDEO_SRC} playsInline />
      </VideoSkinComponent>
    </VideoPlayer>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
