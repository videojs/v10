import { VimeoVideo } from '@videojs/react/media/vimeo-video';

export default function BasicUsage() {
  return (
    <div className="vimeo-video">
      <VimeoVideo src="{{VJS10_DEMO_VIMEO}}" controls />
    </div>
  );
}
