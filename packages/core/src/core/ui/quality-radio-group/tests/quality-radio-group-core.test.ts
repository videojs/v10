import type { MediaQualityState } from '@videojs/media';
import { describe, expect, it, vi } from 'vitest';
import type { QualityRadioGroupState } from '../quality-radio-group-core';
import { QUALITY_AUTO_VALUE, QualityRadioGroupCore } from '../quality-radio-group-core';

function createMediaState(overrides: Partial<MediaQualityState> = {}): MediaQualityState {
  return {
    videoRenditionList: [
      { id: '0', height: 1080, bitrate: 6_000_000, selected: false },
      { id: '1', height: 720, bitrate: 3_000_000, selected: false },
    ],
    activeVideoRendition: null,
    selectVideoRendition: vi.fn(),
    ...overrides,
  };
}

function createState(overrides: Partial<QualityRadioGroupState> = {}): QualityRadioGroupState {
  return {
    options: [
      { kind: 'auto', value: QUALITY_AUTO_VALUE, label: 'Auto', disabled: false },
      {
        kind: 'rendition',
        value: 'rendition:0',
        label: '1080p HD',
        disabled: false,
        rendition: { id: '0', height: 1080, selected: false },
        parts: { primary: '1080p', tier: 'HD' },
      },
      {
        kind: 'rendition',
        value: 'rendition:1',
        label: '720p',
        disabled: false,
        rendition: { id: '1', height: 720, selected: false },
        parts: { primary: '720p' },
      },
    ],
    value: QUALITY_AUTO_VALUE,
    disabled: false,
    hidden: false,
    availability: 'available',
    label: '',
    ...overrides,
  };
}

describe('QualityRadioGroupCore', () => {
  describe('getState', () => {
    it('projects video renditions', () => {
      const core = new QualityRadioGroupCore();
      const media = createMediaState();
      core.setMedia(media);

      const state = core.getState();

      expect(state.options).toEqual([
        { kind: 'auto', value: QUALITY_AUTO_VALUE, label: { key: 'menu.auto', text: 'Auto' }, disabled: false },
        {
          kind: 'rendition',
          value: 'rendition:0',
          label: '1080p HD',
          disabled: false,
          rendition: media.videoRenditionList[0],
          parts: { primary: '1080p', tier: 'HD' },
        },
        {
          kind: 'rendition',
          value: 'rendition:1',
          label: '720p',
          disabled: false,
          rendition: media.videoRenditionList[1],
          parts: { primary: '720p' },
        },
      ]);
      expect(state.value).toBe(QUALITY_AUTO_VALUE);
    });

    it('adds a bitrate badge when multiple renditions share a size', () => {
      const core = new QualityRadioGroupCore();
      const media = createMediaState({
        videoRenditionList: [
          { id: '0', width: 1920, height: 1080, bitrate: 6_000_000, selected: false },
          { id: '1', width: 1080, height: 1920, bitrate: 3_000_000, selected: false },
          { id: '2', width: 1280, height: 720, bitrate: 1_500_000, selected: false },
        ],
      });
      core.setMedia(media);

      expect(core.getState().options).toEqual([
        { kind: 'auto', value: QUALITY_AUTO_VALUE, label: { key: 'menu.auto', text: 'Auto' }, disabled: false },
        {
          kind: 'rendition',
          value: 'rendition:0',
          label: '1080p HD 6 Mbps',
          disabled: false,
          rendition: media.videoRenditionList[0],
          parts: { primary: '1080p', tier: 'HD', bitrate: '6 Mbps' },
        },
        {
          kind: 'rendition',
          value: 'rendition:1',
          label: '1080p HD 3 Mbps',
          disabled: false,
          rendition: media.videoRenditionList[1],
          parts: { primary: '1080p', tier: 'HD', bitrate: '3 Mbps' },
        },
        {
          kind: 'rendition',
          value: 'rendition:2',
          label: '720p',
          disabled: false,
          rendition: media.videoRenditionList[2],
          parts: { primary: '720p' },
        },
      ]);
    });

    it('adds superscript labels for high-resolution renditions', () => {
      const core = new QualityRadioGroupCore();
      const media = createMediaState({
        videoRenditionList: [
          { id: '0', width: 1920, height: 1080, selected: false },
          { id: '1', width: 3840, height: 2160, selected: false },
          { id: '2', width: 7680, height: 4320, selected: false },
        ],
      });
      core.setMedia(media);

      expect(core.getState().options).toEqual([
        { kind: 'auto', value: QUALITY_AUTO_VALUE, label: { key: 'menu.auto', text: 'Auto' }, disabled: false },
        {
          kind: 'rendition',
          value: 'rendition:0',
          label: '1080p HD',
          disabled: false,
          rendition: media.videoRenditionList[0],
          parts: { primary: '1080p', tier: 'HD' },
        },
        {
          kind: 'rendition',
          value: 'rendition:1',
          label: '2160p 4K',
          disabled: false,
          rendition: media.videoRenditionList[1],
          parts: { primary: '2160p', tier: '4K' },
        },
        {
          kind: 'rendition',
          value: 'rendition:2',
          label: '4320p 8K',
          disabled: false,
          rendition: media.videoRenditionList[2],
          parts: { primary: '4320p', tier: '8K' },
        },
      ]);
    });

    it('uses the selected rendition value', () => {
      const core = new QualityRadioGroupCore();
      const media = createMediaState({
        videoRenditionList: [
          { id: '0', height: 1080, selected: false },
          { id: '1', height: 720, selected: true },
        ],
      });
      core.setMedia(media);

      expect(core.getState().value).toBe('rendition:1');
    });

    it('labels automatic with the active rendition', () => {
      const core = new QualityRadioGroupCore();
      const media = createMediaState({
        activeVideoRendition: { id: '1', height: 720, selected: false },
      });
      core.setMedia(media);

      const state = core.getState();

      expect(state.value).toBe(QUALITY_AUTO_VALUE);
      expect(state.options[0]).toEqual({
        kind: 'auto',
        value: QUALITY_AUTO_VALUE,
        label: { key: 'menu.autoWithLabel', text: 'Auto ({label})' },
        labelParams: { label: '720p' },
        disabled: false,
      });
    });

    it('marks availability unavailable with one rendition', () => {
      const core = new QualityRadioGroupCore();
      core.setMedia(createMediaState({ videoRenditionList: [{ id: '0', height: 1080, selected: false }] }));

      expect(core.getState()).toMatchObject({ availability: 'unavailable', disabled: true, hidden: true });
    });
  });

  describe('getLabel', () => {
    it('returns the default label', () => {
      const core = new QualityRadioGroupCore();
      expect(core.getLabel(createState())).toMatchObject({ key: 'menu.quality', text: 'Quality' });
    });

    it('returns a custom string label', () => {
      const core = new QualityRadioGroupCore({ label: 'Video quality' });
      expect(core.getLabel(createState())).toBe('Video quality');
    });
  });

  describe('getRenditionLabel', () => {
    it('formats height labels by default', () => {
      const core = new QualityRadioGroupCore();
      expect(core.getRenditionLabel({ height: 1080, selected: false })).toBe('1080p');
    });

    it('formats portrait labels using the shorter dimension', () => {
      const core = new QualityRadioGroupCore();
      expect(core.getRenditionLabel({ width: 1080, height: 1920, selected: false })).toBe('1080p');
    });

    it('formats cinematic landscape labels using matching widescreen classes', () => {
      const core = new QualityRadioGroupCore();

      expect(core.getRenditionLabel({ width: 1920, height: 800, selected: false })).toBe('1080p');
      expect(core.getRenditionLabel({ width: 3840, height: 1600, selected: false })).toBe('2160p');
    });

    it('formats non-standard wide landscape labels using height', () => {
      const core = new QualityRadioGroupCore();

      expect(core.getRenditionLabel({ width: 1234, height: 567, selected: false })).toBe('567p');
    });

    it('formats bitrate labels when height is missing', () => {
      const core = new QualityRadioGroupCore();
      expect(core.getRenditionLabel({ bitrate: 1_500_000, selected: false })).toBe('1.5 Mbps');
    });

    it('uses a custom formatter', () => {
      const core = new QualityRadioGroupCore({
        formatRendition: (rendition) => `${rendition.width}×${rendition.height}`,
      });

      expect(core.getRenditionLabel({ width: 1920, height: 1080, selected: false })).toBe('1920×1080');
    });
  });

  describe('selectValue', () => {
    it('selects automatic quality', () => {
      const core = new QualityRadioGroupCore();
      const media = createMediaState();

      core.selectValue(media, QUALITY_AUTO_VALUE);

      expect(media.selectVideoRendition).toHaveBeenCalledWith(null);
    });

    it('selects a known rendition', () => {
      const core = new QualityRadioGroupCore();
      const media = createMediaState();

      core.selectValue(media, 'rendition:1');

      expect(media.selectVideoRendition).toHaveBeenCalledWith(1);
    });

    it('keeps automatic selection distinct from a rendition whose id is auto', () => {
      const core = new QualityRadioGroupCore();
      const media = createMediaState({
        videoRenditionList: [
          { id: 'auto', height: 1080, selected: false },
          { id: 'other', height: 720, selected: false },
        ],
      });
      core.setMedia(media);

      core.selectValue(media, 'rendition:0');

      expect(media.selectVideoRendition).toHaveBeenCalledWith(0);
    });

    it('selects the correct duplicate rendition without ids', () => {
      const core = new QualityRadioGroupCore();
      const media = createMediaState({
        videoRenditionList: [
          { height: 1080, bitrate: 6_000_000, selected: false },
          { height: 1080, bitrate: 6_000_000, selected: false },
        ],
      });
      core.setMedia(media);

      core.selectValue(media, 'rendition:1');

      expect(media.selectVideoRendition).toHaveBeenCalledWith(1);
    });

    it('does nothing for an unknown rendition', () => {
      const core = new QualityRadioGroupCore();
      const media = createMediaState();

      core.selectValue(media, '3');

      expect(media.selectVideoRendition).not.toHaveBeenCalled();
    });

    it('does nothing when disabled', () => {
      const core = new QualityRadioGroupCore({ disabled: true });
      const media = createMediaState();

      core.selectValue(media, '1');

      expect(media.selectVideoRendition).not.toHaveBeenCalled();
    });
  });
});
