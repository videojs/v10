import { defineComponent, defineSchema } from 'vjsc/components';
import type { RegistryEntry } from 'vjsc/registry';

const DEFINITIONS = {
  AirPlayEnterIcon: defineComponent({ name: 'AirPlayEnterIcon' }),
  AirPlayExitIcon: defineComponent({ name: 'AirPlayExitIcon' }),
  CaptionsOffIcon: defineComponent({ name: 'CaptionsOffIcon' }),
  CaptionsOnIcon: defineComponent({ name: 'CaptionsOnIcon' }),
  CastEnterIcon: defineComponent({ name: 'CastEnterIcon' }),
  CastExitIcon: defineComponent({ name: 'CastExitIcon' }),
  CheckIcon: defineComponent({ name: 'CheckIcon' }),
  ChevronIcon: defineComponent({ name: 'ChevronIcon' }),
  FullscreenEnterIcon: defineComponent({ name: 'FullscreenEnterIcon' }),
  FullscreenExitIcon: defineComponent({ name: 'FullscreenExitIcon' }),
  GearIcon: defineComponent({ name: 'GearIcon' }),
  PauseIcon: defineComponent({ name: 'PauseIcon' }),
  PipEnterIcon: defineComponent({ name: 'PipEnterIcon' }),
  PipExitIcon: defineComponent({ name: 'PipExitIcon' }),
  PlayIcon: defineComponent({ name: 'PlayIcon' }),
  QualityIcon: defineComponent({ name: 'QualityIcon' }),
  RestartIcon: defineComponent({ name: 'RestartIcon' }),
  SeekIcon: defineComponent({ name: 'SeekIcon' }),
  SpeechIcon: defineComponent({ name: 'SpeechIcon' }),
  SpeedIcon: defineComponent({ name: 'SpeedIcon' }),
  SpinnerIcon: defineComponent({ name: 'SpinnerIcon' }),
  SwitchesIcon: defineComponent({ name: 'SwitchesIcon' }),
  VolumeHighIcon: defineComponent({ name: 'VolumeHighIcon' }),
  VolumeLowIcon: defineComponent({ name: 'VolumeLowIcon' }),
  VolumeOffIcon: defineComponent({ name: 'VolumeOffIcon' }),
} as const;

export const schema = defineSchema('@videojs/icons/vjsc', DEFINITIONS);

export function mapEntries(resolve: (component: keyof typeof DEFINITIONS, name: string) => RegistryEntry) {
  return {
    AirPlayEnterIcon: resolve('AirPlayEnterIcon', 'airplay-enter'),
    AirPlayExitIcon: resolve('AirPlayExitIcon', 'airplay-exit'),
    CaptionsOffIcon: resolve('CaptionsOffIcon', 'captions-off'),
    CaptionsOnIcon: resolve('CaptionsOnIcon', 'captions-on'),
    CastEnterIcon: resolve('CastEnterIcon', 'cast-enter'),
    CastExitIcon: resolve('CastExitIcon', 'cast-exit'),
    CheckIcon: resolve('CheckIcon', 'check'),
    ChevronIcon: resolve('ChevronIcon', 'chevron'),
    FullscreenEnterIcon: resolve('FullscreenEnterIcon', 'fullscreen-enter'),
    FullscreenExitIcon: resolve('FullscreenExitIcon', 'fullscreen-exit'),
    GearIcon: resolve('GearIcon', 'gear'),
    PauseIcon: resolve('PauseIcon', 'pause'),
    PipEnterIcon: resolve('PipEnterIcon', 'pip-enter'),
    PipExitIcon: resolve('PipExitIcon', 'pip-exit'),
    PlayIcon: resolve('PlayIcon', 'play'),
    QualityIcon: resolve('QualityIcon', 'quality'),
    RestartIcon: resolve('RestartIcon', 'restart'),
    SeekIcon: resolve('SeekIcon', 'seek'),
    SpeechIcon: resolve('SpeechIcon', 'speech'),
    SpeedIcon: resolve('SpeedIcon', 'speed'),
    SpinnerIcon: resolve('SpinnerIcon', 'spinner'),
    SwitchesIcon: resolve('SwitchesIcon', 'switches'),
    VolumeHighIcon: resolve('VolumeHighIcon', 'volume-high'),
    VolumeLowIcon: resolve('VolumeLowIcon', 'volume-low'),
    VolumeOffIcon: resolve('VolumeOffIcon', 'volume-off'),
  };
}
