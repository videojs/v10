'use client';

import { createI18nBase } from './base';

export const i18nBase = createI18nBase();

export const { I18nContext, useLocale, useTranslator } = i18nBase;
