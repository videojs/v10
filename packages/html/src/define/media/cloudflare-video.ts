import { CloudflareVideoElement } from '../../media/cloudflare-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(CloudflareVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [CloudflareVideoElement.tagName]: CloudflareVideoElement;
  }
}
