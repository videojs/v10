'use client';

import { useMedia } from '@videojs/react';

export function MediaProbe() {
  const media = useMedia();

  return <output data-media-probe data-attached={media ? 'true' : 'false'} />;
}
