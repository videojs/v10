'use client';

import { QUALITY_AUTO_VALUE, QualityRadioGroupCore } from '@videojs/core';
import { logMissingFeature, selectQuality } from '@videojs/core/dom';
import { resolveTranslationPhrase } from '@videojs/core/i18n/base';
import { useCallback, useState } from 'react';

import { useTranslator } from '../../i18n/instance';
import { usePlayer } from '../../player/context';

export interface QualityOptionsProps extends QualityRadioGroupCore.Props {}

export interface QualityOption {
  value: string;
  label: string;
  tier?: string | undefined;
  badge?: string | undefined;
  disabled: boolean;
}

export interface QualityOptionsResult {
  state: QualityRadioGroupCore.State;
  value: string;
  options: QualityOption[];
  disabled: boolean;
  setValue: (value: string) => void;
}

export function useQualityOptions(props?: QualityOptionsProps): QualityOptionsResult | null {
  'use no memo';

  const media = usePlayer(selectQuality);
  const t = useTranslator();
  const [core] = useState(() => new QualityRadioGroupCore());

  core.setProps(props ?? {});

  const setValue = useCallback((value: string) => core.selectValue(media!, value), [core, media]);

  if (!media) {
    if (__DEV__) logMissingFeature('useQualityOptions', selectQuality.displayName ?? 'quality');
    return null;
  }

  core.setMedia(media);
  const state = core.getState();

  return {
    state,
    value: state.value,
    options: [
      {
        value: QUALITY_AUTO_VALUE,
        label: resolveTranslationPhrase(t, state.autoLabel, state.autoLabelParams),
        disabled: state.disabled,
      },
      ...state.renditions.map((rendition) => ({
        value: rendition.value,
        label: resolveTranslationPhrase(t, rendition.label),
        ...(rendition.tier && { tier: rendition.tier }),
        ...(rendition.badge && { badge: rendition.badge }),
        disabled: state.disabled,
      })),
    ],
    disabled: state.disabled,
    setValue,
  };
}

export namespace useQualityOptions {
  export type Props = QualityOptionsProps;
  export type Result = QualityOptionsResult;
  export type Option = QualityOption;
}
