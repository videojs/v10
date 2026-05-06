import { describe, expect, it } from 'vitest';

import {
  deriveAnnouncerLabel,
  deriveStatus,
  getSeekDirection,
  getSeekIndicatorDisplayValue,
  getStatusIndicatorDisplayValue,
  getVolumeIndicatorDisplayValue,
  type MediaSnapshot,
  predictVolumeActionOutcome,
} from '../status';

const SNAPSHOT: MediaSnapshot = {
  paused: false,
  volume: 0.5,
  muted: false,
  fullscreen: false,
  subtitlesShowing: false,
  pip: false,
  currentTime: 30,
  duration: 120,
};

describe('status', () => {
  it('derives playback status from the expected next state', () => {
    expect(deriveStatus({ action: 'togglePaused' }, SNAPSHOT)).toMatchObject({
      status: 'pause',
      label: 'Paused',
    });

    expect(deriveStatus({ action: 'togglePaused' }, { ...SNAPSHOT, paused: true })).toMatchObject({
      status: 'play',
      label: 'Playing',
    });
  });

  it('derives volume status, value, and announcer labels', () => {
    expect(deriveStatus({ action: 'volumeStep', value: 0.3 }, SNAPSHOT)).toMatchObject({
      status: 'volume-high',
      label: 'Volume',
      value: '80%',
      volumeLevel: 'high',
    });

    expect(deriveAnnouncerLabel({ action: 'volumeStep', value: 0.3 }, SNAPSHOT)).toBe('Volume 80%');
    expect(deriveAnnouncerLabel({ action: 'toggleMuted' }, SNAPSHOT)).toBe('Muted');
  });

  it('derives captions, fullscreen, and picture-in-picture statuses', () => {
    expect(deriveStatus({ action: 'toggleSubtitles' }, SNAPSHOT)?.status).toBe('captions-on');
    expect(deriveStatus({ action: 'toggleFullscreen' }, SNAPSHOT)?.status).toBe('fullscreen');
    expect(deriveStatus({ action: 'toggleFullscreen' }, { ...SNAPSHOT, fullscreen: true })?.status).toBe(
      'exit-fullscreen'
    );
    expect(deriveStatus({ action: 'togglePictureInPicture' }, SNAPSHOT)?.status).toBe('pip');
    expect(deriveStatus({ action: 'togglePictureInPicture' }, { ...SNAPSHOT, pip: true })?.status).toBe('exit-pip');
  });

  it('does not derive status or values for seek and unsupported actions', () => {
    expect(deriveStatus({ action: 'seekStep', value: 10 }, SNAPSHOT)).toBeNull();
    expect(deriveStatus({ action: 'seekToPercent', value: 50 }, SNAPSHOT)?.value ?? null).toBeNull();
    expect(deriveStatus({ action: 'speedUp' }, SNAPSHOT)).toBeNull();
  });

  it('predicts volume outcome like volumeFeature.setVolume when muted', () => {
    expect(predictVolumeActionOutcome({ action: 'volumeStep', value: 0.05 }, { muted: true, volume: 0.5 })).toEqual({
      snapshotVolume: 0.5,
      nextMuted: false,
      nextVolume: 0.55,
    });

    expect(predictVolumeActionOutcome({ action: 'volumeStep', value: -0.05 }, { muted: true, volume: 0.05 })).toEqual({
      snapshotVolume: 0.05,
      nextMuted: true,
      nextVolume: 0,
    });
  });

  it('infers seek direction from action details', () => {
    expect(getSeekDirection({ action: 'seekStep', value: -10 }, SNAPSHOT)).toBe('backward');
    expect(getSeekDirection({ action: 'seekToPercent', key: '8' }, SNAPSHOT)).toBe('forward');
  });

  it('derives display values for mounted indicators', () => {
    expect(getStatusIndicatorDisplayValue({ label: 'Paused', value: null })).toBe('Paused');
    expect(getVolumeIndicatorDisplayValue({ value: null })).toBe('');
    expect(getSeekIndicatorDisplayValue({ value: null, currentTime: '0:30' })).toBe('0:30');
  });
});
