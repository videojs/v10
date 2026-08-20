import { I18nProvider, useLocale } from '@videojs/react/i18n';
import { useState } from 'react';

const locales = ['en-US', 'fr-FR', 'ja-JP'] as const;
type Locale = (typeof locales)[number];

function LocaleDetails() {
  const locale = useLocale();
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date('2026-01-15T12:00:00Z'));

  return (
    <dl className="m-0 grid gap-2">
      <div className="flex items-center gap-2">
        <dt className="text-gray-500">Active locale</dt>
        <dd className="m-0">{locale}</dd>
      </div>
      <div className="flex items-center gap-2">
        <dt className="text-gray-500">Formatted date</dt>
        <dd className="m-0" lang={locale}>
          {date}
        </dd>
      </div>
    </dl>
  );
}

export default function BasicUsage() {
  const [locale, setLocale] = useState<Locale>('en-US');

  return (
    <div className="grid gap-4 p-4">
      <label className="flex items-center gap-2">
        Locale
        <select
          className="px-2 py-1"
          value={locale}
          onChange={(event) => setLocale(event.currentTarget.value as Locale)}
        >
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
