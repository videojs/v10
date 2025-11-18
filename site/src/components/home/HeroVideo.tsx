import { useStore } from '@nanostores/react';
import { FrostedSkin, HlsVideo, MinimalSkin, VideoProvider } from '@videojs/react';
import { VJS8_DEMO_VIDEO } from '@/consts';
import { skin } from '@/stores/homePageDemos';
import '@videojs/react/skins/frosted.css';
import '@videojs/react/skins/minimal.css';

export default function HeroVideo({ className, poster }: { className?: string; poster: string }) {
  const $skin = useStore(skin);
  const SkinComponent = $skin === 'frosted' ? FrostedSkin : MinimalSkin;

  return (
    <VideoProvider>
      <SkinComponent className={className}>
        <HlsVideo
          // @ts-expect-error -- types are incorrect
          src={VJS8_DEMO_VIDEO.hls}
          poster={poster}
          playsInline
        />
      </SkinComponent>
    </VideoProvider>
  );
}
