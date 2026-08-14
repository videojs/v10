import { Container, createPlayer, Menu, PlaybackRateRadioGroup } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';
import type { ReactNode } from 'react';

const { Player } = createPlayer({ features: videoFeatures });

function SpeedMenu(): ReactNode {
  return (
    <Menu.Root side="top" align="end">
      <Menu.Trigger className="settings-trigger" render={<button type="button" />}>
        Speed
      </Menu.Trigger>
      <Menu.Content className="menu">
        <PlaybackRateRadioGroup
          className="menu-group"
          renderItem={(props, item) => (
            <Menu.RadioItem {...props} className="menu-item">
              {item.label}
              <Menu.ItemIndicator checked={item.checked} forceMount className="menu-indicator">
                ✓
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          )}
        />
      </Menu.Content>
    </Menu.Root>
  );
}

export default function BasicUsage() {
  return (
    <Player>
      <Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <div className="menu-bar">
          <SpeedMenu />
        </div>
      </Container>
    </Player>
  );
}
