import { useStore } from '@nanostores/react';
import { createPlayer, features, Poster } from '@videojs/react';
import { MinimalVideoSkin, Video, VideoSkin } from '@videojs/react/video';
import { VJS8_DEMO_VIDEO } from '@/consts';
import { skin } from '@/stores/homePageDemos';
import '@videojs/react/video/skin.css';
import '@videojs/react/video/minimal-skin.css';

const Player = createPlayer({ features: [...features.video] });

export default function HeroVideo({ className, poster }: { className?: string; poster: string }) {
  const $skin = useStore(skin);
  const SkinComponent = $skin === 'frosted' ? VideoSkin : MinimalVideoSkin;

  return (
    <Player.Provider>
      <SkinComponent className={className}>
        <Video src={VJS8_DEMO_VIDEO.mp4} playsInline />
        <Poster src={poster} />
      </SkinComponent>
    </Player.Provider>
  );
}
