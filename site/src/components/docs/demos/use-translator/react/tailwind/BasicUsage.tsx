import { I18nProvider, useTranslator } from '@videojs/react/i18n';
import { useState } from 'react';

const translations = {
  es: {
    buttons: { play: 'Reproducir' },
    seek: { forward: 'Adelantar {seconds} segundos' },
  },
  fr: {
    buttons: { play: 'Lire' },
    seek: { forward: 'Avancer de {seconds} secondes' },
  },
} as const;

type Locale = keyof typeof translations;

function Labels() {
  const t = useTranslator();

  return (
    <dl className="m-0 grid gap-2">
      <div className="flex items-center gap-2">
        <dt className="text-gray-500">Button</dt>
        <dd className="m-0">{t('buttons.play', { default: 'Play' })}</dd>
      </div>
      <div className="flex items-center gap-2">
        <dt className="text-gray-500">Parameterized</dt>
        <dd className="m-0">{t('seek.forward', { seconds: 10, default: 'Seek forward {seconds} seconds' })}</dd>
      </div>
    </dl>
  );
}

export default function BasicUsage() {
  const [locale, setLocale] = useState<Locale>('es');

  return (
    <div className="grid gap-4 p-4">
      <label className="flex items-center gap-2">
        Language
        <select
          className="px-2 py-1"
          value={locale}
          onChange={(event) => setLocale(event.currentTarget.value as Locale)}
        >
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </label>
      <I18nProvider locale={locale} translations={translations[locale]}>
        <Labels />
      </I18nProvider>
    </div>
  );
}
