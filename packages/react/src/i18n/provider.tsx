'use client';

import { createI18nWithBase } from './create-i18n';
import { i18nBase } from './instance';

const built = createI18nWithBase(i18nBase);

export const I18nProvider = built.I18nProvider;
