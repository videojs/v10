import { createPlayer, Menu, useCaptionsOptions } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';
import type { ReactNode } from 'react';

const Player = createPlayer({ features: videoFeatures });

function CaptionsMenu(): ReactNode {
  const captions = useCaptionsOptions();
  if (captions?.state.availability !== 'available') return null;

  return (
    <Menu.Root side="top" align="end">
      <Menu.Trigger className="settings-trigger" render={<button type="button" />}>
        Captions
      </Menu.Trigger>
      <Menu.Content className="menu">
        <Menu.RadioGroup
          className="menu-group"
          value={captions.value}
          onValueChange={captions.setValue}
          aria-label="Captions"
        >
          {captions.options.map((option) => (
            <Menu.RadioItem key={option.value} value={option.value} disabled={option.disabled} className="menu-item">
              {option.label}
              <Menu.ItemIndicator checked={option.value === captions.value} forceMount className="menu-indicator">
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
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop>
          <track kind="captions" src="/docs/demos/captions-button/captions.vtt" srcLang="en" label="English" />
          <track kind="subtitles" src="/docs/demos/captions-button/captions.vtt" srcLang="es" label="Spanish" />
        </Video>
        <div className="menu-bar">
          <CaptionsMenu />
        </div>
      </Player.Container>
    </Player.Provider>
  );
}
