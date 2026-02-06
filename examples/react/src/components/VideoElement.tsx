import { HlsVideo } from '@videojs/react';
import type React from 'react';

export function VideoElement(): React.JSX.Element {
  return (
    <HlsVideo
      src="https://stream.mux.com/fXNzVtmtWuyz00xnSrJg4OJH6PyNo6D02UzmgeKGkP5YQ.m3u8"
      poster="https://image.mux.com/fXNzVtmtWuyz00xnSrJg4OJH6PyNo6D02UzmgeKGkP5YQ/thumbnail.webp"
      playsInline
      onPlay={() => console.log('play')}
    />
  );
}
