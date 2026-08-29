import { Audio, AudioPlayer, AudioSkin, MinimalAudioSkin } from '@videojs/react/audio';
import { BackgroundVideo, BackgroundVideoPlayer, BackgroundVideoSkin } from '@videojs/react/background';

import '@videojs/react/background/skin.css';
import { LiveAudioPlayer, LiveAudioSkin, MinimalLiveAudioSkin } from '@videojs/react/live-audio';
import { LiveVideoPlayer, LiveVideoSkin, MinimalLiveVideoSkin } from '@videojs/react/live-video';
import { HlsAudio } from '@videojs/react/media/hls-audio';

import '@videojs/react/audio/minimal-skin.css';
import '@videojs/react/audio/skin.css';
import { HlsVideo } from '@videojs/react/media/hls-video';

import '@videojs/react/live-audio/minimal-skin.css';
import '@videojs/react/live-audio/skin.css';
import { MinimalVideoSkin, Video, VideoPlayer, VideoSkin } from '@videojs/react/video';

import '@videojs/react/live-video/minimal-skin.css';
import '@videojs/react/live-video/skin.css';
import { VJS10_DEMO_LIVE, VJS10_DEMO_VIDEO } from '@/consts';

import '@videojs/react/video/minimal-skin.css';
import '@videojs/react/video/skin.css';

export type SkinPreviewName =
  | 'audio'
  | 'background'
  | 'live-audio'
  | 'live-video'
  | 'minimal-audio'
  | 'minimal-live-audio'
  | 'minimal-live-video'
  | 'minimal-video'
  | 'video';

export interface SkinPreviewProps {
  skin: SkinPreviewName;
}

type BackgroundSkinStyle = React.CSSProperties & Record<'--media-object-fit', string>;

const backgroundSkinStyle: BackgroundSkinStyle = { '--media-object-fit': 'cover' };

export default function SkinPreview({ skin }: SkinPreviewProps) {
  switch (skin) {
    case 'video':
      return (
        <VideoPlayer poster={VJS10_DEMO_VIDEO.poster}>
          <VideoSkin className="aspect-video">
            <Video src={VJS10_DEMO_VIDEO.mp4} playsInline />
          </VideoSkin>
        </VideoPlayer>
      );
    case 'minimal-video':
      return (
        <VideoPlayer poster={VJS10_DEMO_VIDEO.poster}>
          <MinimalVideoSkin className="aspect-video">
            <Video src={VJS10_DEMO_VIDEO.mp4} playsInline />
          </MinimalVideoSkin>
        </VideoPlayer>
      );
    case 'audio':
      return (
        <AudioPlayer>
          <AudioSkin>
            <Audio src={VJS10_DEMO_VIDEO.mp4} />
          </AudioSkin>
        </AudioPlayer>
      );
    case 'minimal-audio':
      return (
        <AudioPlayer>
          <MinimalAudioSkin>
            <Audio src={VJS10_DEMO_VIDEO.mp4} />
          </MinimalAudioSkin>
        </AudioPlayer>
      );
    case 'live-video':
      return (
        <LiveVideoPlayer poster={VJS10_DEMO_VIDEO.poster}>
          <LiveVideoSkin className="aspect-video">
            <HlsVideo src={VJS10_DEMO_LIVE.hls} playsInline crossOrigin="anonymous" />
          </LiveVideoSkin>
        </LiveVideoPlayer>
      );
    case 'minimal-live-video':
      return (
        <LiveVideoPlayer poster={VJS10_DEMO_VIDEO.poster}>
          <MinimalLiveVideoSkin className="aspect-video">
            <HlsVideo src={VJS10_DEMO_LIVE.hls} playsInline crossOrigin="anonymous" />
          </MinimalLiveVideoSkin>
        </LiveVideoPlayer>
      );
    case 'live-audio':
      return (
        <LiveAudioPlayer>
          <LiveAudioSkin>
            <HlsAudio src={VJS10_DEMO_LIVE.hls} crossOrigin="anonymous" />
          </LiveAudioSkin>
        </LiveAudioPlayer>
      );
    case 'minimal-live-audio':
      return (
        <LiveAudioPlayer>
          <MinimalLiveAudioSkin>
            <HlsAudio src={VJS10_DEMO_LIVE.hls} crossOrigin="anonymous" />
          </MinimalLiveAudioSkin>
        </LiveAudioPlayer>
      );
    case 'background':
      return (
        <BackgroundVideoPlayer>
          <BackgroundVideoSkin className="aspect-video" style={backgroundSkinStyle}>
            <img src={VJS10_DEMO_VIDEO.poster} alt="" />
            <BackgroundVideo src={VJS10_DEMO_VIDEO.mp4} />
          </BackgroundVideoSkin>
        </BackgroundVideoPlayer>
      );
  }
}
