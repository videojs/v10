import { createPlayer, Menu, usePlaybackRateOptions } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';
import type { ReactNode } from 'react';

const Player = createPlayer({ features: videoFeatures });

function SpeedMenu(): ReactNode {
  const playbackRate = usePlaybackRateOptions();
  if (playbackRate?.state.availability !== 'available') return null;

  return (
    <Menu.Root side="top" align="end">
      <Menu.Trigger className="settings-trigger" render={<button type="button" />}>
        Speed
      </Menu.Trigger>
      <Menu.Content className="menu">
        <Menu.RadioGroup
          className="menu-group"
          value={playbackRate.value}
          onValueChange={playbackRate.setValue}
          aria-label="Speed"
        >
          {playbackRate.options.map((option) => (
            <Menu.RadioItem key={option.value} value={option.value} disabled={option.disabled} className="menu-item">
              {option.label}
              <Menu.ItemIndicator checked={option.value === playbackRate.value} forceMount className="menu-indicator">
                ✓
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

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
        <div className="menu-bar">
          <SpeedMenu />
        </div>
      </Player.Container>
    </Player.Provider>
  );
}
