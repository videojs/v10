import { MediaTracksMixin } from '../../core/media/media-tracks';
import { HTMLMediaElementLayer } from './html-media-element-layer';

// Empty subclass so the mixin has a fresh prototype to install onto —
// applying the mixin directly to `HTMLMediaElementLayer` no-ops because
// its prototype already owns `addAudioTrack`/`videoTracks`/etc.
class MediaTracksLayerBase extends HTMLMediaElementLayer {}

/**
 * `HTMLMediaElementLayer` with the media-tracks mixin pre-applied. Push into
 * a media chain via `addLayer(host, new MediaTracksLayer())` so the layer
 * owns the `audioTracks`, `videoTracks`, and rendition lists the host's
 * delegating getters then walk into.
 */
export const MediaTracksLayer = MediaTracksMixin(MediaTracksLayerBase);
export type MediaTracksLayer = InstanceType<typeof MediaTracksLayer>;
