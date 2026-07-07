import { createPlayer, Menu, useQualityOptions } from '@videojs/react';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { videoFeatures } from '@videojs/react/video';
import type { ReactNode } from 'react';

const Player = createPlayer({ features: videoFeatures });
const src = 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8';

function QualityMenu(): ReactNode {
  const quality = useQualityOptions();
  if (quality?.state.availability !== 'available') return null;

  return (
    <Menu.Root side="top" align="end">
      <Menu.Trigger className="settings-trigger" render={<button type="button" />}>
        Quality
      </Menu.Trigger>
      <Menu.Content className="menu">
        <Menu.RadioGroup
          className="menu-group"
          value={quality.value}
          onValueChange={quality.setValue}
          aria-label="Quality"
        >
          {quality.options.map((option) => (
            <Menu.RadioItem key={option.value} value={option.value} disabled={option.disabled} className="menu-item">
              <span>
                {option.label}
                {option.tier ? <sup className="menu-tier">{option.tier}</sup> : null}
              </span>
              {option.badge ? <span className="menu-badge">{option.badge}</span> : null}
              <Menu.ItemIndicator checked={option.value === quality.value} forceMount className="menu-indicator">
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
          <QualityMenu />
        </div>
      </Player.Container>
    </Player.Provider>
  );
}
