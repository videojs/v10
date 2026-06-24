import type { CuePoint } from '@videojs/core/dom/media/cue-points';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { VideoSkin } from '@videojs/react/video';
import { type CSSProperties, useMemo, useState } from 'react';
import { DEFAULT_CUE_POINTS } from './constants';
import { Controls } from './controls';
import { EventLog } from './event-log';
import { SourceField } from './fields';
import { quote } from './format';
import { Getters } from './getters';
import { useMediaLog } from './media-log';
import { getInitialSrc, posterFor, setParam } from './params';

/** Inner demo body — lives inside the player + log providers. */
export function Demo() {
  const { log } = useMediaLog();
  const [src, setSrc] = useState(getInitialSrc);
  const [cuePoints, setCuePoints] = useState<CuePoint[]>(DEFAULT_CUE_POINTS);

  // Cue points are applied through the media config; appending here re-applies
  // the full list via the `cuePoints` config namespace.
  const mediaConfig = useMemo(() => ({ cuePoints: { cuePoints } }), [cuePoints]);
  const addCuePoint = (cuePoint: CuePoint) => setCuePoints((prev) => [...prev, cuePoint]);

  const loadSrc = (next: string) => {
    setSrc(next);
    setParam('src', next);
    // A new asset starts fresh; drop persisted position and track selections.
    setParam('time', null);
    setParam('texttrack', null);
    setParam('audiotrack', null);
    setParam('quality', null);
    log('action', `media.src = ${quote(next)}`);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      {/* Player + message log */}
      <div className="flex flex-col gap-6">
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl shadow-2xl ring-1 ring-faded-black/10">
          <VideoSkin
            className="absolute inset-0 h-full w-full"
            style={
              {
                '--media-object-fit': 'cover',
                '--media-border-radius': '1.5rem',
              } as CSSProperties
            }
            poster={posterFor(src)}
          >
            <HlsVideo src={src} config={mediaConfig} playsInline crossOrigin="anonymous" />
          </VideoSkin>
        </div>
        <EventLog />
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-sm uppercase tracking-wide text-faded-black">Getters</h2>
          <Getters />
        </section>
      </div>

      {/* Source + controls */}
      <aside className="flex flex-col gap-8 self-start border border-faded-black bg-manila-light p-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-sm uppercase tracking-wide text-faded-black">Source</h2>
          <SourceField src={src} onLoad={loadSrc} />
        </section>
        <section className="flex flex-col gap-5">
          <h2 className="font-display text-sm uppercase tracking-wide text-faded-black">Controls</h2>
          <Controls onAddCuePoint={addCuePoint} />
        </section>
      </aside>
    </div>
  );
}
