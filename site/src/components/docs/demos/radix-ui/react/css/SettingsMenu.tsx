import {
  ChatBubbleIcon,
  CheckIcon,
  ChevronRightIcon,
  GearIcon,
  GlobeIcon,
  MixerHorizontalIcon,
  PauseIcon,
  PlayIcon,
  StopwatchIcon,
} from '@radix-ui/react-icons';
import {
  Container,
  selectPlayback,
  useAudioTrackOptions,
  useCaptionsOptions,
  useContainer,
  usePlaybackRateOptions,
  usePlayer,
  useQualityOptions,
} from '@videojs/react';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { VideoPlayer } from '@videojs/react/video';
import { DropdownMenu } from 'radix-ui';
import type { ReactNode } from 'react';

function PlayButton() {
  const playback = usePlayer(selectPlayback);
  if (!playback) return null;

  return (
    <button
      type="button"
      className="radix-player__button"
      aria-label={playback.paused ? 'Play' : 'Pause'}
      onClick={() => playback.togglePaused()}
    >
      {playback.paused ? <PlayIcon /> : <PauseIcon />}
    </button>
  );
}

// Every option hook returns the same shape, so one submenu component serves quality, audio, speed, and captions.
type Options = ReturnType<typeof useQualityOptions>;

function OptionSubmenu({ icon, label, options }: { icon: ReactNode; label: string; options: Options }) {
  const container = useContainer();

  // `hidden` is the hook's own availability flag: no renditions, one audio track, no caption tracks.
  if (!options || options.hidden) return null;

  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger className="radix-player__menu-item radix-player__menu-item--trigger">
        {icon}
        {label}
        <span className="radix-player__menu-hint">
          {options.selectedLabel}
          <ChevronRightIcon />
        </span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.SubContent className="radix-player__menu" sideOffset={6}>
          <DropdownMenu.RadioGroup value={options.value} onValueChange={options.setValue}>
            {options.options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="radix-player__menu-item radix-player__menu-item--radio"
              >
                <DropdownMenu.ItemIndicator className="radix-player__menu-check">
                  <CheckIcon />
                </DropdownMenu.ItemIndicator>
                {option.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  );
}

function SettingsMenu() {
  // Portal into the player container so the menu follows the player into fullscreen.
  const container = useContainer();
  const quality = useQualityOptions();
  const audio = useAudioTrackOptions();
  const rates = usePlaybackRateOptions();
  const captions = useCaptionsOptions();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="radix-player__button" aria-label="Settings">
          <GearIcon />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.Content className="radix-player__menu" side="top" align="end" sideOffset={8}>
          <OptionSubmenu icon={<MixerHorizontalIcon />} label="Quality" options={quality} />
          <OptionSubmenu icon={<GlobeIcon />} label="Audio" options={audio} />
          <OptionSubmenu icon={<StopwatchIcon />} label="Speed" options={rates} />
          <OptionSubmenu icon={<ChatBubbleIcon />} label="Captions" options={captions} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function SettingsMenuDemo() {
  return (
    <VideoPlayer>
      <Container className="radix-player">
        <HlsJsVideo
          src="{{VJS10_DEMO_VIDEO_HLS}}"
          poster="{{VJS10_DEMO_POSTER}}"
          preload="metadata"
          muted
          playsInline
          crossOrigin="anonymous"
        >
          <track kind="captions" src="/docs/demos/captions-button/captions.vtt" srcLang="en" label="English" />
        </HlsJsVideo>
        <div className="radix-player__bar">
          <PlayButton />
          <span className="radix-player__spacer" />
          <SettingsMenu />
        </div>
      </Container>
    </VideoPlayer>
  );
}
