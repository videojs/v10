/**
 * Type-level guard on the Media constructor boundary: `new HlsVideoAdapter({ config })` is checked against the engine
 * config, not `any`.
 *
 * Why a type test: the mixin class must declare `constructor(...args: any[])` (TypeScript's mixin rule), so the only
 * place callers can be typed is the returned constructor's `Arguments`. Nothing at runtime notices a misspelled config
 * key — the engine ignores what it does not read — which is exactly what let a stale key sit in a test through a
 * rename. This pins that the returned type names the options.
 */
import { describe, expectTypeOf, it } from 'vite-plus/test';

import { HlsAudioAdapterCore } from '../../hls-audio';
import { HlsBackgroundVideoAdapterCore } from '../../hls-background-video';
import { type HlsVideoAdapterOptions, HlsVideoAdapterCore, type HlsVideoSource } from '../index';

describe('HlsVideoAdapterOptions', () => {
  it('types the constructor argument', () => {
    expectTypeOf<ConstructorParameters<typeof HlsVideoAdapterCore>>().toEqualTypeOf<
      [options?: HlsVideoAdapterOptions]
    >();
  });

  it('accepts a well-formed engine config and nothing else', () => {
    new HlsVideoAdapterCore();
    new HlsVideoAdapterCore({});
    new HlsVideoAdapterCore({ config: { videoRules: [], drm: { 'com.widevine.alpha': { licenseUrl: 'https://l' } } } });
    // @ts-expect-error — misspelled config key
    new HlsVideoAdapterCore({ config: { videoRulez: [] } });
    // @ts-expect-error — wrong value type
    new HlsVideoAdapterCore({ config: { drm: 'not-an-object' } });
    // @ts-expect-error — unknown option
    new HlsVideoAdapterCore({ engine: {} });
  });

  it('names the structured source type', () => {
    const source: HlsVideoSource = {
      src: 'https://s.m3u8',
      drm: { 'com.apple.fps': { licenseUrl: () => 'https://l' } },
    };

    expectTypeOf(source).toEqualTypeOf<InstanceType<typeof HlsVideoAdapterCore>['source'] & {}>();
  });
});

describe('the audio and background-video counterparts', () => {
  it('type their constructor arguments too', () => {
    new HlsAudioAdapterCore({ config: { audioRules: [] } });
    // @ts-expect-error — misspelled config key
    new HlsAudioAdapterCore({ config: { audioRulez: [] } });

    new HlsBackgroundVideoAdapterCore({ config: { videoRules: [] } });
    // @ts-expect-error — the old, renamed key
    new HlsBackgroundVideoAdapterCore({ config: { rules: [] } });
  });
});
