import '@app/styles.css';
import { VideoPlayer } from '@app/shared/react/players';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { YOUTUBE_VIDEO_SRC } from '@app/shared/sources';
import { YouTubeVideo } from '@videojs/react/media/youtube-video';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <VideoPlayer>
      <VideoSkinComponent>
        <YouTubeVideo className="block h-full w-full" src={YOUTUBE_VIDEO_SRC} playsInline />
      </VideoSkinComponent>
    </VideoPlayer>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
