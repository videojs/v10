import { HlsVideo } from '@videojs/react';

export function VideoElement(): JSX.Element {
  return (
    <HlsVideo
      // @ts-expect-error -- types are incorrect
      src="https://stream.mux.com/fXNzVtmtWuyz00xnSrJg4OJH6PyNo6D02UzmgeKGkP5YQ.m3u8"
      poster="https://image.mux.com/fXNzVtmtWuyz00xnSrJg4OJH6PyNo6D02UzmgeKGkP5YQ/thumbnail.webp"
      playsInline
    />
  );
}
