import { I18nProvider, useTranslator } from '@videojs/react/i18n';
import { useState } from 'react';

import './BasicUsage.css';

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
    <dl className="react-use-translator-basic__output">
      <div>
        <dt>Button</dt>
        <dd>{t('buttons.play', { default: 'Play' })}</dd>
      </div>
      <div>
        <dt>Parameterized</dt>
        <dd>{t('seek.forward', { seconds: 10, default: 'Seek forward {seconds} seconds' })}</dd>
      </div>
    </dl>
  );
}

export default function BasicUsage() {
  const [locale, setLocale] = useState<Locale>('es');

  return (
    <div className="react-use-translator-basic">
      <label>
        Language
        <select value={locale} onChange={(event) => setLocale(event.currentTarget.value as Locale)}>
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
