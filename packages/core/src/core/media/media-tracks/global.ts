import type { AudioRenditionList } from './audio-rendition-list';
import type { AudioTrack } from './audio-track';
import type { AudioTrackList } from './audio-track-list';
import type { VideoRenditionList } from './video-rendition-list';
import type { VideoTrack } from './video-track';
import type { VideoTrackList } from './video-track-list';

declare global {
  interface HTMLMediaElement {
    videoTracks: VideoTrackList;
    audioTracks: AudioTrackList;
    addVideoTrack(kind: string, label?: string, language?: string): VideoTrack;
    addAudioTrack(kind: string, label?: string, language?: string): AudioTrack;
    removeVideoTrack(track: VideoTrack): void;
    removeAudioTrack(track: AudioTrack): void;
    videoRenditions: VideoRenditionList;
    audioRenditions: AudioRenditionList;
  }
}
