import { SpotifyAudioElement } from '../../media/spotify-audio';
import { safeDefine } from '../../registration/safe-define';

safeDefine(SpotifyAudioElement);

export { SpotifyAudioElement };

declare global {
  interface HTMLElementTagNameMap {
    [SpotifyAudioElement.tagName]: SpotifyAudioElement;
  }
}
