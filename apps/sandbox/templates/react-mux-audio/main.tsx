import '@app/styles.css';
import { AudioProvider } from '@app/shared/react/providers';
import { AudioSkinComponent } from '@app/shared/react/skins';
import { useSkin } from '@app/shared/react/use-skin';
import { useSource } from '@app/shared/react/use-source';
import { SOURCES } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { MuxAudio } from '@videojs/react/media/mux-audio';
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';

function readStyling(): Styling {
  return new URLSearchParams(location.search).get('styling') === 'tailwind' ? 'tailwind' : 'css';
}

function App() {
  const skin = useSkin();
  const source = useSource();
  const styling = useMemo(readStyling, []);

  return (
    <AudioProvider>
      <AudioSkinComponent skin={skin} styling={styling} className="w-full max-w-xl mx-auto">
        <MuxAudio src={SOURCES[source].url} debug crossOrigin="anonymous" />
      </AudioSkinComponent>
    </AudioProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
