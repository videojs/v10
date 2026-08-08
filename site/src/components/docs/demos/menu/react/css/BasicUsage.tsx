import {
  createPlayer,
  Menu,
  useAudioTrackOptions,
  useCaptionsOptions,
  usePlaybackRateOptions,
  useQualityOptions,
} from '@videojs/react';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { videoFeatures } from '@videojs/react/video';
import type { ReactNode } from 'react';

const Player = createPlayer({ features: videoFeatures });
const src = '{{VJS10_MULTI_AUDIO_DEMO_VIDEO_HLS}}';

function SettingsMenu(): ReactNode {
  const playbackRate = usePlaybackRateOptions();
  const quality = useQualityOptions();
  const audioTrack = useAudioTrackOptions();
  const captions = useCaptionsOptions();
  const hasPlaybackRate = playbackRate?.state.availability === 'available';
  const hasQuality = quality?.state.availability === 'available';
  const hasAudioTrack = audioTrack?.state.availability === 'available';
  const hasCaptions = captions?.state.availability === 'available';

  if (!hasPlaybackRate && !hasQuality && !hasAudioTrack && !hasCaptions) return null;

  return (
    <Menu.Root side="top" align="end">
      <Menu.Trigger className="settings-trigger" aria-label="Settings" render={<button type="button" />}>
        Settings
      </Menu.Trigger>
      <Menu.TransitionRoot render={<Menu.Content className="menu" />}>
        {hasQuality ? (
          <Menu.TransitionView render={<Menu.Root />}>
            <Menu.Trigger
              className="menu-item"
              render={(props) => (
                <div {...props}>
                  <span>Quality</span>
                  <span className="menu-value">
                    {quality.options.find((option) => option.value === quality.value)?.label}
                    <span aria-hidden="true">›</span>
                  </span>
                </div>
              )}
            />
            <Menu.Content className="menu-panel">
              <Menu.Item className="menu-back">
                <span aria-hidden="true">‹</span>
                Quality
              </Menu.Item>
              <Menu.RadioGroup
                className="menu-group"
                value={quality.value}
                onValueChange={quality.setValue}
                aria-label="Quality"
              >
                {quality.options.map((option) => (
                  <Menu.RadioItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="menu-item"
                  >
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
          </Menu.TransitionView>
        ) : null}

        {hasAudioTrack ? (
          <Menu.TransitionView render={<Menu.Root />}>
            <Menu.Trigger
              className="menu-item"
              render={(props) => (
                <div {...props}>
                  <span>Audio</span>
                  <span className="menu-value">
                    {audioTrack.options.find((option) => option.value === audioTrack.value)?.label}
                    <span aria-hidden="true">›</span>
                  </span>
                </div>
              )}
            />
            <Menu.Content className="menu-panel">
              <Menu.Item className="menu-back">
                <span aria-hidden="true">‹</span>
                Audio
              </Menu.Item>
              <Menu.RadioGroup
                className="menu-group"
                value={audioTrack.value}
                onValueChange={audioTrack.setValue}
                aria-label="Audio tracks"
              >
                {audioTrack.options.map((option) => (
                  <Menu.RadioItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="menu-item"
                  >
                    <span>{option.label}</span>
                    <Menu.ItemIndicator
                      checked={option.value === audioTrack.value}
                      forceMount
                      className="menu-indicator"
                    >
                      ✓
                    </Menu.ItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Content>
          </Menu.TransitionView>
        ) : null}

        {hasPlaybackRate ? (
          <Menu.TransitionView render={<Menu.Root />}>
            <Menu.Trigger
              className="menu-item"
              render={(props) => (
                <div {...props}>
                  <span>Speed</span>
                  <span className="menu-value">
                    {playbackRate.options.find((option) => option.value === playbackRate.value)?.label}
                    <span aria-hidden="true">›</span>
                  </span>
                </div>
              )}
            />
            <Menu.Content className="menu-panel">
              <Menu.Item className="menu-back">
                <span aria-hidden="true">‹</span>
                Speed
              </Menu.Item>
              <Menu.RadioGroup
                className="menu-group"
                value={playbackRate.value}
                onValueChange={playbackRate.setValue}
                aria-label="Playback rate"
              >
                {playbackRate.options.map((option) => (
                  <Menu.RadioItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="menu-item"
                  >
                    <span>{option.label}</span>
                    <Menu.ItemIndicator
                      checked={option.value === playbackRate.value}
                      forceMount
                      className="menu-indicator"
                    >
                      ✓
                    </Menu.ItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Content>
          </Menu.TransitionView>
        ) : null}

        {hasCaptions ? (
          <Menu.TransitionView render={<Menu.Root />}>
            <Menu.Trigger
              className="menu-item"
              render={(props) => (
                <div {...props}>
                  <span>Captions</span>
                  <span className="menu-value">
                    {captions.options.find((option) => option.value === captions.value)?.label}
                    <span aria-hidden="true">›</span>
                  </span>
                </div>
              )}
            />
            <Menu.Content className="menu-panel">
              <Menu.Item className="menu-back">
                <span aria-hidden="true">‹</span>
                Captions
              </Menu.Item>
              <Menu.RadioGroup
                className="menu-group"
                value={captions.value}
                onValueChange={captions.setValue}
                aria-label="Captions"
              >
                {captions.options.map((option) => (
                  <Menu.RadioItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="menu-item"
                  >
                    <span>{option.label}</span>
                    <Menu.ItemIndicator checked={option.value === captions.value} forceMount className="menu-indicator">
                      ✓
                    </Menu.ItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Content>
          </Menu.TransitionView>
        ) : null}

        <Menu.Item className="menu-item" onSelect={() => navigator.clipboard?.writeText(window.location.href)}>
          Copy link
        </Menu.Item>
      </Menu.TransitionRoot>
    </Menu.Root>
  );
}

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <HlsJsVideo src={src} autoPlay crossOrigin="anonymous" muted playsInline loop>
          <track kind="captions" src="/docs/demos/captions-button/captions.vtt" srcLang="en" label="English" />
          <track kind="subtitles" src="/docs/demos/captions-button/captions.vtt" srcLang="es" label="Spanish" />
        </HlsJsVideo>
        <div className="menu-bar">
          <SettingsMenu />
        </div>
      </Player.Container>
    </Player.Provider>
  );
}
