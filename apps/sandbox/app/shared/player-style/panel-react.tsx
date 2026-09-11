import '@app/styles.css';
import { VideoPlayer } from '@app/shared/react/players';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { useSandbox } from '@app/shared/react/use-sandbox';
import { getPosterSrc, SOURCES } from '@app/shared/sources';
import { Video } from '@videojs/react/video';
import { createRoot } from 'react-dom/client';

import type { PlayerStyleTheme } from './config';
import { InstaplayReactSkin } from './react/instaplay';

/** The React ports, by theme. Only the themes with one are offered by the comparison's implementation toggle. */
const reactSkins = {
  instaplay: InstaplayReactSkin,
} as const;

export function hasReactSkin(name: string): boolean {
  return name in reactSkins;
}

/**
 * Mount a React port in place of the hand-written one. The reference frame is untouched, so the comparison is still
 * this implementation against the published original.
 */
export function mountReactPanel(theme: PlayerStyleTheme): void {
  const Skin = reactSkins[theme.name as keyof typeof reactSkins];
  if (!Skin) throw new Error(`No React port for ${theme.name}.`);

  function App() {
    const { source, mediaProps } = useSandbox();

    return (
      <SandboxI18nProvider>
        <VideoPlayer poster={getPosterSrc(source)}>
          <div className="mx-auto aspect-video w-full max-w-4xl">
            <Skin>
              <Video src={SOURCES[source].url} {...mediaProps} playsInline crossOrigin="" />
            </Skin>
          </div>
        </VideoPlayer>
      </SandboxI18nProvider>
    );
  }

  const root = document.getElementById('root');
  if (!root) throw new Error('The sandbox page has no #root element.');

  createRoot(root).render(<App />);
}
