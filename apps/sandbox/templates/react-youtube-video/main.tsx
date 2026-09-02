import '@app/styles.css';
import { VideoPlayer } from '@app/shared/react/players';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useSandbox } from '@app/shared/react/use-sandbox';
import { YOUTUBE_VIDEO_SRC } from '@app/shared/sources';
import { YouTubeVideo } from '@videojs/react/media/youtube-video';
import { createRoot } from 'react-dom/client';

function App() {
  const { skin, styling } = useSandbox();

  return (
    <VideoPlayer>
      <VideoSkinComponent skin={skin} styling={styling}>
        <YouTubeVideo className="block h-full w-full" src={YOUTUBE_VIDEO_SRC} playsInline />
      </VideoSkinComponent>
    </VideoPlayer>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
