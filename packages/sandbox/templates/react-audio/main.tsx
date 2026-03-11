import '@app/styles.css';
import '@videojs/react/audio/skin.css';
import '@videojs/react/audio/minimal-skin.css';
import { AudioProvider } from '@app/shared/react/providers';
import { AudioSkinComponent } from '@app/shared/react/skins';
import { useSkin } from '@app/shared/react/use-skin';
import { useSource } from '@app/shared/react/use-source';
import { SOURCES } from '@app/shared/sources';
import { Audio } from '@videojs/react/audio';
import { createRoot } from 'react-dom/client';

function App() {
  const skin = useSkin();
  const source = useSource(true);

  return (
    <AudioProvider>
      <AudioSkinComponent skin={skin} styling="css" className="w-full max-w-xl mx-auto">
        <Audio src={SOURCES[source].url} />
      </AudioSkinComponent>
    </AudioProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
