import { describe, expectTypeOf, it } from 'vite-plus/test';

import { type HlsAudioAdapterAPI, type HlsAudioAdapterProps, HlsAudioMixin } from '../hls-audio/mixin';
import {
  type HlsBackgroundVideoAdapterAPI,
  type HlsBackgroundVideoAdapterProps,
  HlsBackgroundVideoMixin,
} from '../hls-background-video/mixin';
import { type HlsVideoAdapterAPI, type HlsVideoAdapterProps, HlsVideoMixin } from '../hls-video/mixin';

describe('HLS adapter mixins', () => {
  it('preserves the base and adds the video adapter surface', () => {
    const Adapter = HlsVideoMixin(EventTarget);

    expectTypeOf<InstanceType<typeof Adapter>>().toMatchTypeOf<EventTarget & HlsVideoAdapterAPI>();
    expectTypeOf(Adapter.defaultProps).toEqualTypeOf<HlsVideoAdapterProps>();
    expectTypeOf(Adapter.alternativeMediaSuggestion).toEqualTypeOf<string | undefined>();
  });

  it('preserves the base and adds the audio adapter surface', () => {
    const Adapter = HlsAudioMixin(EventTarget);

    expectTypeOf<InstanceType<typeof Adapter>>().toMatchTypeOf<EventTarget & HlsAudioAdapterAPI>();
    expectTypeOf(Adapter.defaultProps).toEqualTypeOf<HlsAudioAdapterProps>();
    expectTypeOf(Adapter.alternativeMediaSuggestion).toEqualTypeOf<string | undefined>();
  });

  it('preserves the base and adds the background-video adapter surface', () => {
    const Adapter = HlsBackgroundVideoMixin(EventTarget);

    expectTypeOf<InstanceType<typeof Adapter>>().toMatchTypeOf<EventTarget & HlsBackgroundVideoAdapterAPI>();
    expectTypeOf(Adapter.defaultProps).toEqualTypeOf<HlsBackgroundVideoAdapterProps>();
  });
});
