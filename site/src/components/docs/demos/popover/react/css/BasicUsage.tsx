import { createPlayer, Popover } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <div className="bar">
          <Popover.Root>
            <Popover.Trigger className="trigger">Settings</Popover.Trigger>
            <Popover.Popup className="popup">
              <Popover.Arrow className="arrow" />
              <div className="content">Popover content</div>
            </Popover.Popup>
          </Popover.Root>
        </div>
      </Player.Container>
    </Player.Provider>
  );
}
