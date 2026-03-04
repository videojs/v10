// React & Tailwind Sandbox
// http://localhost:5173/react-tailwind/

import { createPlayer } from '@videojs/react';
import {
  MinimalVideoSkinTailwind,
  Video,
  type VideoSkinProps,
  VideoSkinTailwind,
  videoFeatures,
} from '@videojs/react/video';
import { createRoot } from 'react-dom/client';
import { SKINS } from '../constants';
import type { Skin } from '../types';
import { useSkinSwitcher } from '../utils/use-skin-switcher';

const { Provider } = createPlayer({
  features: videoFeatures,
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
  const [skin, setSkin] = useSkinSwitcher();

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
          <Video src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4" />
        </SkinComponent>
      </Provider>
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
