import { createPlayer, Popover } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-popover-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <div className="react-popover-basic__bar">
          <Popover.Root>
            <Popover.Trigger className="react-popover-basic__trigger">Settings</Popover.Trigger>
            <Popover.Popup className="react-popover-basic__popup">
              <Popover.Arrow className="react-popover-basic__arrow" />
              <div className="react-popover-basic__content">Popover content</div>
            </Popover.Popup>
          </Popover.Root>
        </div>
      </Player.Container>
    </Player.Provider>
  );
}
