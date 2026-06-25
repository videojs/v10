import { MediaFeatureElement } from '../../ui/feature/media-feature-element';
import { safeDefine } from '../safe-define';

safeDefine(MediaFeatureElement);

declare global {
  interface HTMLElementTagNameMap {
    [MediaFeatureElement.tagName]: MediaFeatureElement;
  }
}
