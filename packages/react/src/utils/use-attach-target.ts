import type { MediaEngineHost } from '@videojs/media';
import type { RefCallback } from 'react';
import { useCallback, useLayoutEffect, useRef } from 'react';

import { onMediaInstanceTermination } from './media-instance-lifecycle';

interface TargetAttachment<Target> {
  media: MediaEngineHost;
  target: Target;
  releaseTermination: () => void;
}

export function useAttachTarget<Target>(media: MediaEngineHost | null): RefCallback<Target> {
  const targetRef = useRef<Target | null>(null);
  const attachmentRef = useRef<TargetAttachment<Target> | null>(null);

  const detach = useCallback(() => {
    const attachment = attachmentRef.current;
    if (!attachment) return;

    attachmentRef.current = null;
    attachment.releaseTermination();
    attachment.media.detach?.();
  }, []);

  useLayoutEffect(() => {
    const target = targetRef.current;
    const attachment = attachmentRef.current;

    if (attachment && (attachment.media !== media || attachment.target !== target)) detach();

    if (media && target && !attachmentRef.current) {
      media.attach?.(target);
      const nextAttachment: TargetAttachment<Target> = {
        media,
        target,
        releaseTermination: () => {},
      };
      attachmentRef.current = nextAttachment;
      nextAttachment.releaseTermination = onMediaInstanceTermination(media, () => {
        if (attachmentRef.current === nextAttachment) attachmentRef.current = null;
      });
    }
  });

  useLayoutEffect(() => detach, [detach]);

  return useCallback((target) => {
    targetRef.current = target;
  }, []);
}
