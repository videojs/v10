import { useStore } from '@nanostores/react';
import { createPlayer } from '@videojs/react';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { MinimalVideoSkin, VideoSkin, videoFeatures } from '@videojs/react/video';
import { VJS10_DEMO_VIDEO } from '@/consts';
import { skin } from '@/stores/homePageDemos';
import '@videojs/react/video/skin.css';
import '@videojs/react/video/minimal-skin.css';

const Player = createPlayer({ features: videoFeatures });

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
  const SkinComponent = $skin === 'default' ? VideoSkin : MinimalVideoSkin;

  return (
    <Player.Provider>
      <SkinComponent
        className={className}
        style={
          {
            '--media-border-radius': `calc(var(--spacing) * 6)`,
            '--media-object-fit': 'cover',
            ...style,
          } as React.CSSProperties
        }
        poster={poster}
      >
        <HlsVideo src={VJS10_DEMO_VIDEO.hls} playsInline crossOrigin="anonymous">
          <track
            kind="metadata"
            label="thumbnails"
            src={`https://image.mux.com/${VJS10_DEMO_VIDEO.id}/storyboard.vtt`}
          />
        </HlsVideo>
      </SkinComponent>
    </Player.Provider>
  );
}
