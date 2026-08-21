import type { MediaEngineHost } from '@videojs/media';
import type { RefCallback } from 'react';

import { useAttachTarget } from './use-attach-target';

export function useAttachIframe<T extends HTMLIFrameElement>(media: MediaEngineHost | null): RefCallback<T> {
  return useAttachTarget<T>(media);
}
