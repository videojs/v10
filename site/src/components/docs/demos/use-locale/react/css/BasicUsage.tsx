import { I18nProvider, useLocale } from '@videojs/react/i18n';
import { useState } from 'react';

import './BasicUsage.css';

const locales = ['en-US', 'fr-FR', 'ja-JP'] as const;
type Locale = (typeof locales)[number];

function LocaleDetails() {
  const locale = useLocale();
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date('2026-01-15T12:00:00Z'));

  return (
    <dl className="react-use-locale-basic__output">
      <div>
        <dt>Active locale</dt>
        <dd>{locale}</dd>
      </div>
      <div>
        <dt>Formatted date</dt>
        <dd lang={locale}>{date}</dd>
      </div>
    </dl>
  );
}

export default function BasicUsage() {
  const [locale, setLocale] = useState<Locale>('en-US');

  return (
    <div className="react-use-locale-basic">
      <label>
        Locale
        <select value={locale} onChange={(event) => setLocale(event.currentTarget.value as Locale)}>
          {locales.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <I18nProvider locale={locale}>
        <LocaleDetails />
      </I18nProvider>
    </div>
  );
}
