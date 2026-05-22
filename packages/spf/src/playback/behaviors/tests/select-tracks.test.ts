import { describe, expect, it } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { TrackSelectionState } from '../../../media/primitives/select-tracks';
import type {
  AudioSelectionSet,
  AudioTrack,
  MaybeResolvedPresentation,
  PartiallyResolvedAudioTrack,
  PartiallyResolvedVideoTrack,
  Presentation,
  TextSelectionSet,
  VideoSelectionSet,
} from '../../../media/types';
import { selectAudioTrack, selectTextTrack, selectVideoTrack } from '../select-tracks';

type AudioState = TrackSelectionState & { userAudioTrackSelection?: Partial<AudioTrack> };

function makeState(initial: AudioState = {}): StateSignals<AudioState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    selectedVideoTrackId: signal<string | undefined>(initial.selectedVideoTrackId),
    selectedAudioTrackId: signal<string | undefined>(initial.selectedAudioTrackId),
    selectedTextTrackId: signal<string | undefined>(initial.selectedTextTrackId),
    userAudioTrackSelection: signal<Partial<AudioTrack> | undefined>(initial.userAudioTrackSelection),
  };
}

// Helper to create a minimal presentation
function createPresentation(config: {
  video?: PartiallyResolvedVideoTrack[];
  audio?: PartiallyResolvedAudioTrack[];
  text?: any[];
}): Presentation {
  const selectionSets = [];

  if (config.video && config.video.length > 0) {
    selectionSets.push({
      id: 'video-set',
      type: 'video' as const,
      switchingSets: [
        {
          id: 'video-switching',
          type: 'video' as const,
          tracks: config.video,
        },
      ],
    } as VideoSelectionSet);
  }

  if (config.audio && config.audio.length > 0) {
    selectionSets.push({
      id: 'audio-set',
      type: 'audio' as const,
      switchingSets: [
        {
          id: 'audio-switching',
          type: 'audio' as const,
          tracks: config.audio,
        },
      ],
    } as AudioSelectionSet);
  }

  if (config.text && config.text.length > 0) {
    selectionSets.push({
      id: 'text-set',
      type: 'text' as const,
      switchingSets: [
        {
          id: 'text-switching',
          type: 'text' as const,
          tracks: config.text,
        },
      ],
    } as TextSelectionSet);
  }

  return {
    id: 'pres-1',
    url: 'http://example.com/playlist.m3u8',
    selectionSets,
    startTime: 0,
  };
}

// `selectVideoTrack` is the simple (non-ABR) video selector — ABR-driven
// selection is exercised in `quality-switching.test.ts`.

describe('selectVideoTrack', () => {
  it('selects first video track when presentation loaded', async () => {
    const videoTracks: PartiallyResolvedVideoTrack[] = [
      {
        type: 'video',
        id: 'video-low',
        url: 'http://example.com/video-low.m3u8',
        bandwidth: 600_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.4d401f'],
      },
      {
        type: 'video',
        id: 'video-high',
        url: 'http://example.com/video-high.m3u8',
        bandwidth: 2_400_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.4d401f'],
      },
    ];

    const presentation = createPresentation({ video: videoTracks });
    const state = makeState({ presentation });

    const reactor = selectVideoTrack.setup({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedVideoTrackId.get()).toBe('video-low');

    reactor.destroy();
  });

  it('clears selectedVideoTrackId on src unload', async () => {
    const videoTracks: PartiallyResolvedVideoTrack[] = [
      {
        type: 'video',
        id: 'video-only',
        url: 'http://example.com/video-only.m3u8',
        bandwidth: 1_000_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.4d401f'],
      },
    ];

    const presentation = createPresentation({ video: videoTracks });
    const state = makeState({ presentation });

    const reactor = selectVideoTrack.setup({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedVideoTrackId.get()).toBe('video-only');

    state.presentation.set(undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedVideoTrackId.get()).toBeUndefined();

    reactor.destroy();
  });

  it('honors a caller-supplied picker', async () => {
    const videoTracks: PartiallyResolvedVideoTrack[] = [
      {
        type: 'video',
        id: 'video-low',
        url: 'http://example.com/video-low.m3u8',
        bandwidth: 600_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.4d401f'],
      },
      {
        type: 'video',
        id: 'video-high',
        url: 'http://example.com/video-high.m3u8',
        bandwidth: 2_400_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.4d401f'],
      },
    ];

    const presentation = createPresentation({ video: videoTracks });
    const state = makeState({ presentation });

    // Custom picker bypasses the default first-track rule and pins to a
    // specific id; the behavior should honor it.
    const reactor = selectVideoTrack.setup({
      state,
      config: { picker: () => 'video-high' },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedVideoTrackId.get()).toBe('video-high');

    reactor.destroy();
  });
});

describe('selectAudioTrack', () => {
  it('selects audio track when presentation loaded', async () => {
    const audioTracks: PartiallyResolvedAudioTrack[] = [
      {
        type: 'audio',
        id: 'audio-en',
        url: 'http://example.com/audio-en.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'English',
        sampleRate: 48000,
        channels: 2,
      },
    ];

    const presentation = createPresentation({ audio: audioTracks });
    const state = makeState({ presentation });

    const reactor = selectAudioTrack.setup({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    reactor.destroy();
  });

  it('does not select when audio track already selected', async () => {
    const presentation = createPresentation({ audio: [] });
    const state = makeState({ presentation, selectedAudioTrackId: 'existing-audio' });

    const reactor = selectAudioTrack.setup({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('existing-audio');

    reactor.destroy();
  });

  it('picks track matching preferredAudioLanguage when supplied', async () => {
    const audioTracks: PartiallyResolvedAudioTrack[] = [
      {
        type: 'audio',
        id: 'audio-en',
        url: 'http://example.com/audio-en.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'English',
        language: 'en',
        sampleRate: 48000,
        channels: 2,
      },
      {
        type: 'audio',
        id: 'audio-es',
        url: 'http://example.com/audio-es.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'Spanish',
        language: 'es',
        sampleRate: 48000,
        channels: 2,
      },
    ];

    const presentation = createPresentation({ audio: audioTracks });
    const state = makeState({ presentation });

    const reactor = selectAudioTrack.setup({ state, config: { preferredAudioLanguage: 'es' } });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    reactor.destroy();
  });

  it('falls back to DEFAULT=YES track when preferredAudioLanguage does not match', async () => {
    const audioTracks: PartiallyResolvedAudioTrack[] = [
      {
        type: 'audio',
        id: 'audio-en',
        url: 'http://example.com/audio-en.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'English',
        language: 'en',
        sampleRate: 48000,
        channels: 2,
      },
      {
        type: 'audio',
        id: 'audio-fr',
        url: 'http://example.com/audio-fr.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'French',
        language: 'fr',
        default: true,
        sampleRate: 48000,
        channels: 2,
      },
    ];

    const presentation = createPresentation({ audio: audioTracks });
    const state = makeState({ presentation });

    // Preferred language 'xx' has no match; picker falls back to the default
    // track ('audio-fr') rather than the first track ('audio-en').
    const reactor = selectAudioTrack.setup({ state, config: { preferredAudioLanguage: 'xx' } });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('audio-fr');

    reactor.destroy();
  });

  it('narrows candidates by userAudioTrackSelection filter (language)', async () => {
    const audioTracks: PartiallyResolvedAudioTrack[] = [
      {
        type: 'audio',
        id: 'audio-en',
        url: 'http://example.com/audio-en.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'English',
        language: 'en',
        sampleRate: 48000,
        channels: 2,
      },
      {
        type: 'audio',
        id: 'audio-es',
        url: 'http://example.com/audio-es.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'Spanish',
        language: 'es',
        sampleRate: 48000,
        channels: 2,
      },
    ];

    const presentation = createPresentation({ audio: audioTracks });
    const state = makeState({ presentation, userAudioTrackSelection: { language: 'es' } });

    const reactor = selectAudioTrack.setup({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Filter narrows to one Spanish track; selection picks it regardless of
    // default picker preference.
    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    reactor.destroy();
  });

  it('re-picks on userAudioTrackSelection change mid-presentation', async () => {
    const audioTracks: PartiallyResolvedAudioTrack[] = [
      {
        type: 'audio',
        id: 'audio-en',
        url: 'http://example.com/audio-en.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'English',
        language: 'en',
        sampleRate: 48000,
        channels: 2,
      },
      {
        type: 'audio',
        id: 'audio-es',
        url: 'http://example.com/audio-es.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'Spanish',
        language: 'es',
        sampleRate: 48000,
        channels: 2,
      },
    ];

    const presentation = createPresentation({ audio: audioTracks });
    const state = makeState({ presentation });

    const reactor = selectAudioTrack.setup({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    // Consumer writes filter; selection re-picks to Spanish.
    state.userAudioTrackSelection.set({ language: 'es' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    // Consumer clears filter; selection stays on the current pick (no
    // re-pick to first — the slot is non-empty and the filter no longer
    // narrows; ABR-shaped behavior would re-evaluate, but the simple picker
    // only fires when slot is empty or filter narrows to one).
    state.userAudioTrackSelection.set(undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    reactor.destroy();
  });

  it('filter narrowing to a single track short-circuits the picker', async () => {
    const audioTracks: PartiallyResolvedAudioTrack[] = [
      {
        type: 'audio',
        id: 'audio-en',
        url: 'http://example.com/audio-en.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'English',
        language: 'en',
        sampleRate: 48000,
        channels: 2,
      },
      {
        type: 'audio',
        id: 'audio-es',
        url: 'http://example.com/audio-es.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'Spanish',
        language: 'es',
        sampleRate: 48000,
        channels: 2,
      },
    ];

    const presentation = createPresentation({ audio: audioTracks });
    const state = makeState({ presentation, userAudioTrackSelection: { id: 'audio-es' } });

    // Picker would normally pick first (no preferredAudioLanguage). Filter pins to es.
    const reactor = selectAudioTrack.setup({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    reactor.destroy();
  });

  it('empty filter result falls back to unfiltered candidate set', async () => {
    const audioTracks: PartiallyResolvedAudioTrack[] = [
      {
        type: 'audio',
        id: 'audio-en',
        url: 'http://example.com/audio-en.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'English',
        language: 'en',
        sampleRate: 48000,
        channels: 2,
      },
    ];

    const presentation = createPresentation({ audio: audioTracks });
    // Filter narrows to zero (no Spanish track). Picker falls back to full set.
    const state = makeState({ presentation, userAudioTrackSelection: { language: 'es' } });

    const reactor = selectAudioTrack.setup({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    reactor.destroy();
  });

  it('falls back to first track when no language preference and no DEFAULT track', async () => {
    const audioTracks: PartiallyResolvedAudioTrack[] = [
      {
        type: 'audio',
        id: 'audio-en',
        url: 'http://example.com/audio-en.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'English',
        language: 'en',
        sampleRate: 48000,
        channels: 2,
      },
      {
        type: 'audio',
        id: 'audio-es',
        url: 'http://example.com/audio-es.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'Spanish',
        language: 'es',
        sampleRate: 48000,
        channels: 2,
      },
    ];

    const presentation = createPresentation({ audio: audioTracks });
    const state = makeState({ presentation });

    const reactor = selectAudioTrack.setup({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    reactor.destroy();
  });
});

describe('selectTextTrack', () => {
  it('does not auto-select text track', async () => {
    const textTracks = [
      {
        type: 'text' as const,
        id: 'text-en',
        url: 'http://example.com/text-en.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        groupId: 'text',
        label: 'English',
        kind: 'subtitles' as const,
      },
    ];

    const presentation = createPresentation({ text: textTracks });
    const state = makeState({ presentation });

    const reactor = selectTextTrack.setup({ state, config: {} });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedTextTrackId.get()).toBeUndefined();

    reactor.destroy();
  });
});
