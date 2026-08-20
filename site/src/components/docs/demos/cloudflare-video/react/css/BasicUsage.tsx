import { CloudflareVideo } from '@videojs/react/media/cloudflare-video';

export default function BasicUsage() {
  return (
    <div className="cloudflare-video">
      <CloudflareVideo src="{{VJS10_DEMO_CLOUDFLARE}}" controls />
    </div>
  );
}
