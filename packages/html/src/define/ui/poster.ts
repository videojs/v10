import { PosterElement } from '../../ui/poster/poster-element';
import { safeDefine } from '../safe-define';

safeDefine(PosterElement);

declare global {
  interface HTMLElementTagNameMap {
    [PosterElement.tagName]: PosterElement;
  }
}
