import '@app/styles.css';
import { ensureSandboxLocale } from '@app/shared/i18n/sandbox-locales';
import { VideoProvider } from '@app/shared/react/providers';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { Storyboard } from '@app/shared/react/storyboard';
import { useAutoplay } from '@app/shared/react/use-autoplay';
import { useLocale } from '@app/shared/react/use-locale';
import { useLoop } from '@app/shared/react/use-loop';
import { useMuted } from '@app/shared/react/use-muted';
import { usePoster } from '@app/shared/react/use-poster';
import { usePreload } from '@app/shared/react/use-preload';
import { useSkin } from '@app/shared/react/use-skin';
import { useSource } from '@app/shared/react/use-source';
import { useStoryboard } from '@app/shared/react/use-storyboard';
import { SOURCES } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { I18nProvider } from '@videojs/react/i18n';
import { Video } from '@videojs/react/video';
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

function readStyling(): Styling {
  return new URLSearchParams(location.search).get('styling') === 'tailwind' ? 'tailwind' : 'css';
}

function App() {
  const skin = useSkin();
  const source = useSource();
  const styling = useMemo(readStyling, []);
  const poster = usePoster();
  const storyboard = useStoryboard();
  const autoplay = useAutoplay();
  const muted = useMuted();
  const loop = useLoop();
  const preload = usePreload();
  const locale = useLocale();
  const [registeredLocale, setRegisteredLocale] = useState<string | null>(null);

  useEffect(() => {
    ensureSandboxLocale(locale);
    setRegisteredLocale(locale);
  }, [locale]);

  if (registeredLocale !== locale) {
    return null;
  }

  return (
    <VideoProvider>
      <I18nProvider locale={locale}>
        <VideoSkinComponent poster={poster} skin={skin} styling={styling} className="aspect-video max-w-4xl mx-auto">
          <Video
            src={SOURCES[source].url}
            autoPlay={autoplay}
            muted={muted}
            loop={loop}
            preload={preload}
            playsInline
            crossOrigin="anonymous"
          >
            <Storyboard src={storyboard} />
          </Video>
        </VideoSkinComponent>
      </I18nProvider>
    </VideoProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
