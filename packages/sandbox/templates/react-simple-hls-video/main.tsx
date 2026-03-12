import '@app/styles.css';
import '@videojs/react/video/skin.css';
import '@videojs/react/video/minimal-skin.css';
import { VideoProvider } from '@app/shared/react/providers';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useSkin } from '@app/shared/react/use-skin';
import { useSource } from '@app/shared/react/use-source';
import { SOURCES } from '@app/shared/sources';
import { SimpleHlsVideo } from '@videojs/react/media/simple-hls-video';
import { createRoot } from 'react-dom/client';

function App() {
  const skin = useSkin();
  const source = useSource();

  return (
    <VideoProvider>
      <VideoSkinComponent skin={skin} styling="css" className="w-full aspect-video max-w-4xl mx-auto">
        <SimpleHlsVideo src={SOURCES[source].url} playsInline />
      </VideoSkinComponent>
    </VideoProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
