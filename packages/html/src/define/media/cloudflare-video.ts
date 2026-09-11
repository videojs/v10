import { CloudflareVideoElement } from '../../media/cloudflare-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(CloudflareVideoElement);

export { CloudflareVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [CloudflareVideoElement.tagName]: CloudflareVideoElement;
  }
}
