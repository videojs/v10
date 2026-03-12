import '@app/styles.css';
import { VideoProvider } from '@app/shared/react/providers';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useSkin } from '@app/shared/react/use-skin';
import { useSource } from '@app/shared/react/use-source';
import { SOURCES } from '@app/shared/sources';
import { Video } from '@videojs/react/video';
import { createRoot } from 'react-dom/client';

function App() {
  const skin = useSkin();
  const source = useSource();

  return (
    <VideoProvider>
      <VideoSkinComponent skin={skin} styling="tailwind" className="w-full aspect-video max-w-4xl mx-auto">
        <Video src={SOURCES[source].url} playsInline />
      </VideoSkinComponent>
    </VideoProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
