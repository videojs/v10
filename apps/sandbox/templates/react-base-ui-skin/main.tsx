import '@app/styles.css';
import { VideoPlayer } from '@app/shared/react/players';
import { SOURCES } from '@app/shared/sources';
import { Container } from '@videojs/react';
import { Video } from '@videojs/react/video';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { HooksApproachControls } from './approach-hooks';
import { RenderApproachControls } from './approach-render';
import {
  type Approach,
  APPROACHES,
  Frame,
  readApproach,
  SELECT_CLASS,
  useSandboxSource,
  writeApproach,
} from './shared';

function App() {
  const [approach, setApproach] = useState<Approach>(readApproach);
  const { source, mediaProps } = useSandboxSource();
  const current = APPROACHES.find((entry) => entry.value === approach)!;

  const select = (next: Approach) => {
    writeApproach(next);
    setApproach(next);
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <label className="flex items-center gap-2 text-sm">
        Approach
        <select className={SELECT_CLASS} value={approach} onChange={(event) => select(event.target.value as Approach)}>
          {APPROACHES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      <VideoPlayer>
        <Frame>
          <Container className="group/player relative size-full">
            <Video className="block size-full" src={SOURCES[source].url} {...mediaProps} playsInline crossOrigin="" />
            {approach === 'render' ? <RenderApproachControls /> : <HooksApproachControls />}
          </Container>
        </Frame>
      </VideoPlayer>
      <p className="max-w-[56rem] text-center text-sm text-neutral-600 dark:text-neutral-400">{current.blurb}</p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
