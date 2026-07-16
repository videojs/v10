'use client';

import { QUALITY_AUTO_VALUE, QualityRadioGroupCore } from '@videojs/core';
import { logMissingFeature, selectQuality } from '@videojs/core/dom';
import { translateText } from '@videojs/core/i18n';
import { useCallback, useState } from 'react';

import { useTranslator } from '../../i18n/context';
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

/**
 * Create quality menu options (including an `Auto` option) from the player
 * video rendition state. Returns `null` when the quality feature is not
 * configured.
 *
 * @param props - Optional `label`, `formatRendition`, and `disabled` overrides.
 */
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
        label: translateText(state.autoLabel, t, state.autoLabelParams),
        disabled: state.disabled,
      },
      ...state.renditions.map((rendition) => ({
        value: rendition.value,
        label: translateText(rendition.label, t),
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
