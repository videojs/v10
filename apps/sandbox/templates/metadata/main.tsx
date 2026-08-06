import '@app/styles.css';

import { SOURCES } from '@app/shared/sources';
import { createPlayer, metadataFeature } from '@videojs/react';
import { Video } from '@videojs/react/video';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const Player = createPlayer({ features: [metadataFeature] });

type ContentDataVideo = HTMLVideoElement & {
  contentData: Record<string, string | null | undefined>;
};

function MetadataVideo({ contentTitle }: { contentTitle: string | null | undefined }) {
  const media = useRef<ContentDataVideo | null>(null);
  const initialTitle = useRef(contentTitle);

  const configureMedia = useCallback((element: HTMLVideoElement | null) => {
    if (!element) {
      media.current = null;
      return;
    }

    Object.defineProperty(element, 'contentData', {
      configurable: true,
      writable: true,
      value: initialTitle.current === undefined ? {} : { title: initialTitle.current },
    });
    media.current = element as ContentDataVideo;
  }, []);

  useLayoutEffect(() => {
    if (!media.current || Object.is(media.current.contentData.title, contentTitle)) return;
    const contentData = { ...media.current.contentData };
    if (contentTitle === undefined) delete contentData.title;
    else contentData.title = contentTitle;
    media.current.contentData = contentData;
    media.current.dispatchEvent(new Event('contentdatachange'));
  }, [contentTitle]);

  return (
    <Video
      className="aspect-video w-full bg-black object-cover"
      controls
      crossOrigin="anonymous"
      playsInline
      ref={configureMedia}
      src={SOURCES['mp4-1'].url}
    />
  );
}

function PlayerPreview({ mediaTitle }: { mediaTitle: string | null | undefined }) {
  const contentTitle = Player.usePlayer((state) => state.contentTitle);

  return (
    <div className="relative mt-6 overflow-hidden rounded-lg bg-black shadow-lg">
      <MetadataVideo contentTitle={mediaTitle} />
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent px-5 pb-12 pt-4">
        {contentTitle ? (
          <h2 className="text-xl font-semibold text-white drop-shadow">{contentTitle}</h2>
        ) : (
          <span className="text-sm text-white/70">No content title is defined</span>
        )}
      </div>
    </div>
  );
}

const sources = [
  { key: 'user', label: 'User title' },
  { key: 'media', label: 'Media title' },
  { key: 'default', label: 'User default' },
] as const;

type SourceKey = (typeof sources)[number]['key'];

function App() {
  const [enabled, setEnabled] = useState<Record<SourceKey, boolean>>({
    user: true,
    media: true,
    default: true,
  });
  const [values, setValues] = useState<Record<SourceKey, string>>({
    user: 'User title',
    media: 'Media title',
    default: 'Default title',
  });

  const userTitle = enabled.user ? values.user : null;
  const mediaTitle = enabled.media ? values.media : undefined;
  const defaultTitle = enabled.default ? values.default : null;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Content metadata precedence</h1>
      <p className="mt-2 text-zinc-600">
        Enable title sources and edit their values. The demo media donates its title through{' '}
        <code>contentData.title</code> and emits <code>contentdatachange</code>. An empty enabled input contributes the
        literal empty string. A disabled user tier contributes <code>null</code>; disabled media removes the title key
        from its still-supported content-data bag.
      </p>

      <fieldset className="mt-6 grid gap-3 rounded-lg border border-zinc-300 bg-white p-4">
        <legend className="px-1 text-sm font-medium text-zinc-700">Title sources</legend>
        {sources.map(({ key, label }) => (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3" key={key}>
            <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">
              <input
                checked={enabled[key]}
                onChange={() => setEnabled((current) => ({ ...current, [key]: !current[key] }))}
                type="checkbox"
              />
              <span>{label}</span>
            </label>
            <input
              aria-label={`${label} value`}
              className="rounded border border-zinc-300 px-3 py-2 disabled:bg-zinc-100 disabled:text-zinc-400"
              disabled={!enabled[key]}
              onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
              placeholder={enabled[key] ? 'empty string' : key === 'media' ? 'undefined' : 'null'}
              type="text"
              value={enabled[key] ? values[key] : ''}
            />
          </div>
        ))}
      </fieldset>

      <Player.Provider contentTitle={userTitle} defaultContentTitle={defaultTitle}>
        <PlayerPreview mediaTitle={mediaTitle} />
      </Player.Provider>

      <p className="mt-4 font-mono text-sm text-zinc-600">user ?? media ?? userDefault ?? featureDefault</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
