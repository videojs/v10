import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { useCallback, useState } from 'react';
import { DEFAULT_CUE_POINTS } from './constants';
import { Controls, TransportControls } from './controls';
import { CUE_POINT_TRACK_LABEL, type CuePoint, useCuePointTrack } from './cue-points';
import { EventLog } from './event-log';
import { Field, SourceField } from './fields';
import { cueValue, quote } from './format';
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
  const [cuePointTrackEl, setCuePointTrackEl] = useState<HTMLTrackElement | null>(null);

  const addCuePoint = (cuePoint: CuePoint) => setCuePoints((prev) => [...prev, cuePoint]);
  const removeCuePoint = (index: number) => setCuePoints((prev) => prev.filter((_, i) => i !== index));

  // Cue points live on the `<track kind="metadata">` element below; the hook
  // writes them as cues and reports the active one on every `cuechange`.
  const logActiveCuePoint = useCallback(
    (cuePoint: CuePoint | null) => {
      log('event', `cuechange → ${cuePoint ? cueValue(cuePoint.value) : 'null'}`);
    },
    [log]
  );

  useCuePointTrack({ media, trackEl: cuePointTrackEl, cuePoints, onActiveChange: logActiveCuePoint });

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
              poster={posterFor(src)}
              preload={preload}
              playsInline
              crossOrigin="anonymous"
              className="absolute inset-0 h-full w-full object-cover"
            >
              {/* Cue points are just cues on a metadata track element. */}
              <track ref={setCuePointTrackEl} kind="metadata" label={CUE_POINT_TRACK_LABEL} default />
            </HlsJsVideo>
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
