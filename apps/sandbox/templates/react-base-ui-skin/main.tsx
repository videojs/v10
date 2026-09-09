import '@app/styles.css';
import {
  HarnessToolbar,
  PlayerFrame,
  SelectedMedia,
  selectedPoster,
  useLibrarySkinSelection,
} from '@app/shared/react/library-skin-harness';
import { VideoPlayer } from '@app/shared/react/players';
import { SelectField } from '@app/shell/select';
import { Container } from '@videojs/react';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { HooksApproachControls } from './approach-hooks';
import { RenderApproachControls } from './approach-render';
import { type Approach, APPROACHES, readApproach, writeApproach } from './shared';

function App() {
  const [approach, setApproach] = useState<Approach>(readApproach);
  const selection = useLibrarySkinSelection();
  const current = APPROACHES.find((entry) => entry.value === approach)!;

  const select = (next: Approach) => {
    writeApproach(next);
    setApproach(next);
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <HarnessToolbar selection={selection}>
        <SelectField
          label="Approach"
          value={approach}
          onChange={(value) => select(value as Approach)}
          options={APPROACHES.map((entry) => ({ value: entry.value, label: entry.label }))}
        />
      </HarnessToolbar>
      <VideoPlayer poster={selectedPoster(selection.source)}>
        <PlayerFrame>
          <Container className="group/player relative size-full">
            <SelectedMedia selection={selection} />
            {approach === 'render' ? <RenderApproachControls /> : <HooksApproachControls />}
          </Container>
        </PlayerFrame>
      </VideoPlayer>
      <p className="max-w-[56rem] text-center text-sm text-neutral-600 dark:text-neutral-400">{current.blurb}</p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
