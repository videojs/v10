import { Audio } from '@videojs/react/audio';
import { createRoot } from 'react-dom/client';
import { AudioProvider } from '../shared/react/providers';
import { AudioSkinComponent } from '../shared/react/skins';
import { useSkin } from '../shared/react/use-skin';
import { useSource } from '../shared/react/use-source';
import { SOURCES } from '../shared/sources';

function App() {
  const skin = useSkin();
  const source = useSource(true);

  return (
    <AudioProvider>
      <AudioSkinComponent skin={skin} styling="tailwind" className="w-full max-w-xl mx-auto">
        <Audio src={SOURCES[source].url} />
      </AudioSkinComponent>
    </AudioProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
