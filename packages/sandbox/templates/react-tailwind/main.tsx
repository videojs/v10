// React & Tailwind Sandbox
// http://localhost:5173/react-tailwind/

import { createPlayer, features } from '@videojs/react';
import { MinimalVideoSkinTailwind, Video, type VideoSkinProps, VideoSkinTailwind } from '@videojs/react/video';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SKINS } from '../constants';
import type { Skin } from '../types';

const { Provider } = createPlayer({
  features: features.video,
});

function SkinComponent({ skin, ...props }: { skin: Skin } & VideoSkinProps) {
  switch (skin) {
    case 'default':
      return <VideoSkinTailwind {...props} />;
    case 'minimal':
      return <MinimalVideoSkinTailwind {...props} />;
  }
}

function App() {
  const [skin, setSkin] = useState<Skin>('default');

  return (
    <div className="flex flex-col justify-center items-center gap-4 my-4">
      <select value={skin} onChange={(e) => setSkin(e.target.value as Skin)} aria-label="Skin">
        {SKINS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <Provider>
        <SkinComponent skin={skin} className="w-full aspect-video max-w-4xl mx-auto">
          <Video src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4" />
        </SkinComponent>
      </Provider>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
