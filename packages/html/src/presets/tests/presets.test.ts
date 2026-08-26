import { describe, expect, it, vi } from 'vitest';

describe('HTML preset exports', () => {
  it('do not register custom elements when imported', async () => {
    const define = vi.spyOn(customElements, 'define');

    const [video, audio, liveVideo, liveAudio, background] = await Promise.all([
      import('../video'),
      import('../audio'),
      import('../live-video'),
      import('../live-audio'),
      import('../background'),
    ]);

    expect(define).not.toHaveBeenCalled();
    expect(video.VideoPlayerElement).toBeTypeOf('function');
    expect(video.VideoSkinElement).toBeTypeOf('function');
    expect(video.MinimalVideoSkinElement).toBeTypeOf('function');
    expect('VideoSkinTailwindElement' in video).toBe(false);
    expect('MinimalVideoSkinTailwindElement' in video).toBe(false);
    expect(audio.AudioPlayerElement).toBeTypeOf('function');
    expect(audio.AudioSkinElement).toBeTypeOf('function');
    expect(audio.MinimalAudioSkinElement).toBeTypeOf('function');
    expect('AudioSkinTailwindElement' in audio).toBe(false);
    expect('MinimalAudioSkinTailwindElement' in audio).toBe(false);
    expect(liveVideo.LiveVideoPlayerElement).toBeTypeOf('function');
    expect(liveVideo.LiveVideoSkinElement).toBeTypeOf('function');
    expect(liveVideo.MinimalLiveVideoSkinElement).toBeTypeOf('function');
    expect('LiveVideoSkinTailwindElement' in liveVideo).toBe(false);
    expect('MinimalLiveVideoSkinTailwindElement' in liveVideo).toBe(false);
    expect(liveAudio.LiveAudioPlayerElement).toBeTypeOf('function');
    expect(liveAudio.LiveAudioSkinElement).toBeTypeOf('function');
    expect(liveAudio.MinimalLiveAudioSkinElement).toBeTypeOf('function');
    expect('LiveAudioSkinTailwindElement' in liveAudio).toBe(false);
    expect('MinimalLiveAudioSkinTailwindElement' in liveAudio).toBe(false);
    expect(background.BackgroundVideoPlayerElement).toBeTypeOf('function');
    expect(background.BackgroundVideoSkinElement).toBeTypeOf('function');

    define.mockRestore();
  });
});
