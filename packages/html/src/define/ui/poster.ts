import { safeDefine } from '../../registration/safe-define';
import { PosterElement } from '../../ui/poster/poster-element';

safeDefine(PosterElement);

declare global {
  interface HTMLElementTagNameMap {
    [PosterElement.tagName]: PosterElement;
  }
}
