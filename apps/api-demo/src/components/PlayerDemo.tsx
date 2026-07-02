'use client';

import { Demo } from './player-demo/demo';
import { MediaLogProvider } from './player-demo/media-log';
import { Player } from './player-demo/player';

export default function PlayerDemo() {
  return (
    <Player.Provider>
      <MediaLogProvider>
        <Demo />
      </MediaLogProvider>
    </Player.Provider>
  );
}
