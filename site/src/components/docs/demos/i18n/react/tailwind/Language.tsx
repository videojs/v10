import { createPlayer } from '@videojs/react';
import { I18nProvider, LOCALES } from '@videojs/react/i18n';
import { Video, VideoSkin, videoFeatures } from '@videojs/react/video';
import { useState } from 'react';

import '@videojs/react/video/skin.css';

const { Player } = createPlayer({ features: videoFeatures });
const locales = ['en', ...LOCALES] as const;
type Locale = (typeof locales)[number];
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });

export default function Language() {
  const [locale, setLocale] = useState<Locale>('en');

  return (
    <div className="grid gap-4 p-4">
      <label className="flex items-center gap-2">
        Language
        <select
          className="px-2 py-1"
          value={locale}
          onChange={(event) => setLocale(event.currentTarget.value as Locale)}
        >
          {locales.map((value) => (
            <option key={value} value={value}>
              {languageNames.of(value) ?? value}
            </option>
          ))}
        </select>
      </label>
      <Player>
        <I18nProvider locale={locale}>
          <VideoSkin className="aspect-video w-full">
            <Video src="{{VJS10_DEMO_VIDEO_MP4}}" muted playsInline />
          </VideoSkin>
        </I18nProvider>
      </Player>
    </div>
  );
}
