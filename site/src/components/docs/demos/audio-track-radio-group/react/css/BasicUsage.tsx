import { createPlayer, Menu, useAudioTrackOptions } from '@videojs/react';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { videoFeatures } from '@videojs/react/video';
import type { ReactNode } from 'react';

const Player = createPlayer({ features: videoFeatures });
const src = '{{VJS10_MULTI_AUDIO_DEMO_VIDEO_HLS}}';

function AudioMenu(): ReactNode {
  const audioTrack = useAudioTrackOptions();
  if (audioTrack?.state.availability !== 'available') return null;

  return (
    <Menu.Root side="top" align="end">
      <Menu.Trigger className="settings-trigger" render={<button type="button" />}>
        Audio
      </Menu.Trigger>
      <Menu.Content className="menu">
        <Menu.RadioGroup
          className="menu-group"
          value={audioTrack.value}
          onValueChange={audioTrack.setValue}
          aria-label="Audio tracks"
        >
          {audioTrack.options.map((option) => (
            <Menu.RadioItem key={option.value} value={option.value} disabled={option.disabled} className="menu-item">
              {option.label}
              <Menu.ItemIndicator checked={option.value === audioTrack.value} forceMount className="menu-indicator">
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
        <HlsJsVideo src={src} autoPlay crossOrigin="anonymous" muted playsInline loop />
        <div className="menu-bar">
          <AudioMenu />
        </div>
      </Player.Container>
    </Player.Provider>
  );
}
