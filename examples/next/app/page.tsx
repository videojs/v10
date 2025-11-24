import { FrostedSkin, HlsVideo, MinimalSkin, VideoProvider } from '@videojs/react';
import '@videojs/react/skins/frosted.css';
import '@videojs/react/skins/minimal.css';

export default function Home() {
  return (
    <main className="p-4">
      <h1 className="text-4xl font-extrabold py-2">Frosted Skin</h1>
      <VideoProvider>
        <FrostedSkin>
          {/* @ts-expect-error -- types are incorrect */}
          <HlsVideo src="https://stream.mux.com/fXNzVtmtWuyz00xnSrJg4OJH6PyNo6D02UzmgeKGkP5YQ.m3u8" playsInline />
        </FrostedSkin>
      </VideoProvider>
      <h1 className="text-4xl font-extrabold py-2">Minimal Skin</h1>
      <VideoProvider>
        <MinimalSkin>
          {/* @ts-expect-error -- types are incorrect */}
          <HlsVideo src="https://stream.mux.com/fXNzVtmtWuyz00xnSrJg4OJH6PyNo6D02UzmgeKGkP5YQ.m3u8" playsInline />
        </MinimalSkin>
      </VideoProvider>
    </main>
  );
}
