import type { CuePoint } from '@videojs/core/dom/media/cue-points';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { useMemo, useState } from 'react';
import { DEFAULT_CUE_POINTS } from './constants';
import { Controls, TransportControls } from './controls';
import { EventLog } from './event-log';
import { Field, SourceField } from './fields';
import { quote } from './format';
import { Getters } from './getters';
import { useMediaLog } from './media-log';
import { getInitialSrc, posterFor, readParams, resetParamsToSrc, setParam } from './params';
import { Player, type TracksMedia } from './player';
import { SELECT_CLASS } from './styles';

type Preload = 'none' | 'metadata' | 'auto';

function getInitialPreload(): Preload {
  const value = readParams().get('preload');
  return value === 'none' || value === 'metadata' || value === 'auto' ? value : 'metadata';
}

/** Inner demo body — lives inside the player + log providers. */
export function Demo() {
  const { log } = useMediaLog();
  const media = Player.useMedia() as TracksMedia | null;
  const [src, setSrc] = useState(getInitialSrc);
  const [preload, setPreload] = useState<Preload>(getInitialPreload);
  const [cuePoints, setCuePoints] = useState<CuePoint[]>(DEFAULT_CUE_POINTS);

  // Cue points are applied through the media config; appending here re-applies
  // the full list via the `cuePoints` config namespace.
  const mediaConfig = useMemo(() => ({ cuePoints: { cuePoints } }), [cuePoints]);
  const addCuePoint = (cuePoint: CuePoint) => setCuePoints((prev) => [...prev, cuePoint]);
  const removeCuePoint = (index: number) => setCuePoints((prev) => prev.filter((_, i) => i !== index));

  const loadSrc = (next: string) => {
    setSrc(next);
    // A new asset starts fresh — drop every other persisted param except preload.
    resetParamsToSrc(next, { preload });
    // Reset the media element's state so the new source plays from a clean slate.
    if (media) {
      media.currentTime = 0;
      media.playbackRate = 1;
      media.volume = 1;
      media.muted = false;
      media.loop = false;
    }
    log('action', `media.src = ${quote(next)}`);
  };

  const changePreload = (next: Preload) => {
    setPreload(next);
    log('action', `media.preload = ${quote(next)}`);
    setParam('preload', next);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
      {/* Player + transport controls pin together; the rest scrolls under them */}
      <div className="flex flex-col gap-6">
        <div className="z-10 flex flex-col gap-6 bg-manila-light lg:sticky lg:top-4 dark:bg-faded-black">
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl shadow-2xl ring-1 ring-faded-black/10 dark:ring-manila-light/10">
            <HlsJsVideo
              src={src}
              config={mediaConfig}
              poster={posterFor(src)}
              preload={preload}
              playsInline
              crossOrigin="anonymous"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <TransportControls />
        </div>
        <Controls cuePoints={cuePoints} onAddCuePoint={addCuePoint} onRemoveCuePoint={removeCuePoint} />
      </div>

      {/* Source + message log + getters */}
      <aside className="flex flex-col gap-8 self-start border border-faded-black bg-manila-light p-6 lg:sticky lg:top-4 dark:border-manila-light dark:bg-faded-black">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-sm uppercase tracking-wide text-faded-black dark:text-manila-light">
            Source
          </h2>
          <SourceField src={src} onLoad={loadSrc} />
          <Field label="Preload">
            <select
              className={SELECT_CLASS}
              value={preload}
              aria-label="Preload"
              onChange={(event) => changePreload(event.target.value as Preload)}
            >
              <option value="none">none</option>
              <option value="metadata">metadata</option>
              <option value="auto">auto</option>
            </select>
          </Field>
        </section>
        <EventLog />
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-sm uppercase tracking-wide text-faded-black dark:text-manila-light">
            Getters
          </h2>
          <Getters />
        </section>
      </aside>
    </div>
  );
}
