import { LOCALES } from '@videojs/html/i18n';
import '@videojs/html/video/player';
import '@videojs/html/video/skin';

const root = document.querySelector<HTMLElement>('.html-i18n-language');
const select = root?.querySelector('select');
const provider = root?.querySelector('media-i18n');
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });

for (const locale of ['en', ...LOCALES]) {
  const option = document.createElement('option');
  option.value = locale;
  option.textContent = languageNames.of(locale) ?? locale;
  select?.append(option);
}

select?.addEventListener('change', () => {
  provider?.setAttribute('lang', select.value);
});
