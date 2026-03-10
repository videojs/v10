import '@videojs/react/video/skin.css';
import '@videojs/react/video/minimal-skin.css';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { createRoot } from 'react-dom/client';
import { VideoProvider } from '../shared/react/providers';
import { VideoSkinComponent } from '../shared/react/skins';
import { useSkin } from '../shared/react/use-skin';
import { useSource } from '../shared/react/use-source';
import { SOURCES } from '../shared/sources';

function App() {
  const skin = useSkin();
  const source = useSource();

  return (
    <VideoProvider>
      <VideoSkinComponent skin={skin} styling="css" className="w-full aspect-video max-w-4xl mx-auto">
        <HlsVideo src={SOURCES[source].url} />
      </VideoSkinComponent>
    </VideoProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
