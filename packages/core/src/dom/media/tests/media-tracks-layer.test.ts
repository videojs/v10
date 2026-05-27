import { describe, expect, it } from 'vitest';
import { addLayer } from '../../../core/media/media-layer';
import { HTMLVideoElementHost } from '../html-video-element-host';
import { MediaTracksLayer } from '../media-tracks-layer';

describe('MediaTracksLayer', () => {
  it('routes host track authoring through the installed layer', () => {
    const host = new HTMLVideoElementHost();
    addLayer(host, new MediaTracksLayer());

    const track = host.addAudioTrack('main', 'English', 'en');

    expect(host.audioTracks.length).toBe(1);
    expect(host.audioTracks[0]).toBe(track);
    expect([...host.audioTracks]).toEqual([track]);
  });
});
