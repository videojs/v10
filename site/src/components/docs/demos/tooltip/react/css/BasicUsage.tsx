import { createPlayer, Tooltip } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-tooltip-basic">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <div className="react-tooltip-basic__bar">
          <Tooltip.Root>
            <Tooltip.Trigger className="react-tooltip-basic__trigger">Hover me</Tooltip.Trigger>
            <Tooltip.Popup className="react-tooltip-basic__popup">
              <Tooltip.Arrow className="react-tooltip-basic__arrow" />
              Tooltip content
            </Tooltip.Popup>
          </Tooltip.Root>
        </div>
      </Player.Container>
    </Player.Provider>
  );
}
