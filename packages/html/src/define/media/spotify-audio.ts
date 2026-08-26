import { SpotifyAudioElement } from '../../media/spotify-audio/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(SpotifyAudioElement);

declare global {
  interface HTMLElementTagNameMap {
    [SpotifyAudioElement.tagName]: SpotifyAudioElement;
  }
}
