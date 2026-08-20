import { SpotifyAudio } from '../../media/spotify-audio';
import { safeDefine } from '../safe-define';

export class SpotifyAudioElement extends SpotifyAudio {
  static readonly tagName = 'spotify-audio';
}

safeDefine(SpotifyAudioElement);

declare global {
  interface HTMLElementTagNameMap {
    [SpotifyAudioElement.tagName]: SpotifyAudioElement;
  }
}
