import type { VideoSkinProps } from '@videojs/react/video';
import { MinimalVideoSkin, VideoSkin } from '@videojs/react/video';
import minimalSkinUrl from '@videojs/react/video/minimal-skin.css?url';
import defaultSkinUrl from '@videojs/react/video/skin.css?url';
import { useEffect } from 'react';
import type { Skin } from '../types';

const stylesheets: Record<Skin, string> = {
  default: defaultSkinUrl,
  minimal: minimalSkinUrl,
};

function useStylesheet(url: string) {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [url]);
}

export function SkinComponent({ skin, ...props }: { skin: Skin } & VideoSkinProps) {
  useStylesheet(stylesheets[skin]);

  switch (skin) {
    case 'default':
      return <VideoSkin {...props} />;
    case 'minimal':
      return <MinimalVideoSkin {...props} />;
  }
}
