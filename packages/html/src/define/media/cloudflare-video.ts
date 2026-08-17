import { CloudflareVideo } from '../../media/cloudflare-video';
import { safeDefine } from '../safe-define';

export class CloudflareVideoElement extends CloudflareVideo {
  static readonly tagName = 'cloudflare-video';
}

safeDefine(CloudflareVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [CloudflareVideoElement.tagName]: CloudflareVideoElement;
  }
}
