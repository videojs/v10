import type { SandboxSource } from '../../../apps/sandbox/app/shared/sources';
import { Audio } from '../../react/src/media/audio';
import { DashVideo } from '../../react/src/media/dash-video';
import { MuxAudio } from '../../react/src/media/mux-audio/hls-js';
import { MuxVideo } from '../../react/src/media/mux-video';
import { Video } from '../../react/src/media/video';
import type { CaptionsMode } from './options';

export interface ReactPreviewMediaOptions {
  readonly captions: string;
  readonly captionsMode: CaptionsMode;
  readonly isAudio: boolean;
  readonly media: SandboxSource;
  readonly storyboard: string | undefined;
}

export function ReactPreviewMedia({ captions, captionsMode, isAudio, media, storyboard }: ReactPreviewMediaOptions) {
  const tracks = (
    <>
      <track kind="subtitles" label="English" src={captions} srcLang="en" />
      {captionsMode === 'multiple' ? <track kind="subtitles" label="Spanish" src={captions} srcLang="es" /> : null}
      {media.chapters?.map(({ isDefault, label, lang, src }) => (
        <track key={lang} kind="chapters" label={label} src={src} srcLang={lang} default={isDefault} />
      ))}
      {storyboard ? <track kind="metadata" label="thumbnails" src={storyboard} default /> : null}
    </>
  );

  if (isAudio && media.source) {
    return (
      <MuxAudio source={media.source} crossOrigin="anonymous">
        {tracks}
      </MuxAudio>
    );
  }

  if (isAudio && media.type === 'hls') {
    return (
      <MuxAudio src={media.url ?? ''} crossOrigin="anonymous">
        {tracks}
      </MuxAudio>
    );
  }

  if (isAudio) {
    return (
      <Audio src={media.url ?? ''} crossOrigin="anonymous">
        {tracks}
      </Audio>
    );
  }

  if (media.source) {
    return (
      <MuxVideo source={media.source} playsInline crossOrigin="anonymous">
        {tracks}
      </MuxVideo>
    );
  }

  if (media.type === 'dash') {
    return (
      <DashVideo src={media.url ?? ''} playsInline crossOrigin="anonymous">
        {tracks}
      </DashVideo>
    );
  }

  if (media.type === 'hls') {
    return (
      <MuxVideo src={media.url ?? ''} playsInline crossOrigin="anonymous">
        {tracks}
      </MuxVideo>
    );
  }

  return (
    <Video src={media.url ?? ''} playsInline crossOrigin="anonymous">
      {tracks}
    </Video>
  );
}
