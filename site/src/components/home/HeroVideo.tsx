import { useStore } from '@nanostores/react';
import { createPlayer, Poster } from '@videojs/react';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { MinimalVideoSkin, Video, VideoSkin, videoFeatures } from '@videojs/react/video';
import { VJS10_DEMO_VIDEO } from '@/consts';
import { skin } from '@/stores/homePageDemos';
import '@videojs/react/video/skin.css';
import '@videojs/react/video/minimal-skin.css';

const Player = createPlayer({ features: [...videoFeatures] });

export default function HeroVideo({
  className,
  poster,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
  poster: string;
}) {
  const $skin = useStore(skin);
  const SkinComponent = $skin === 'frosted' ? VideoSkin : MinimalVideoSkin;

  return (
    <Player.Provider>
      <SkinComponent
        className={className}
        style={{ '--media-border-radius': `calc(var(--spacing) * 6)`, ...style } as React.CSSProperties}
      >
        {/*<HlsVideo src={VJS10_DEMO_VIDEO.hls} playsInline style={{ objectFit: 'cover' }} />*/}
        <Video src={VJS10_DEMO_VIDEO.mp4} playsInline style={{ objectFit: 'cover' }} />
        <Poster src={poster} />
      </SkinComponent>
    </Player.Provider>
  );
}
