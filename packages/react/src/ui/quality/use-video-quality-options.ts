'use client';

import {
  type QualityRadioGroupAutoOption,
  QualityRadioGroupCore,
  type QualityRadioGroupRenditionOption,
} from '@videojs/core';
import { selectQuality } from '@videojs/core/dom';
import { translateText } from '@videojs/core/i18n';

import { useTranslator } from '../../i18n/context';
import { createRadioOptionsHook, type TranslatedRadioOption } from '../hooks/create-radio-options-hook';

export interface VideoQualityOptionsProps extends QualityRadioGroupCore.Props {}

export interface VideoQualityAutoOption extends TranslatedRadioOption<QualityRadioGroupAutoOption> {
  parts: {
    primary: string;
    tier?: string | undefined;
    bitrate?: string | undefined;
  };
}

export interface VideoQualityRenditionOption
  extends Omit<TranslatedRadioOption<QualityRadioGroupRenditionOption>, 'parts'> {
  parts: {
    primary: string;
    tier?: string | undefined;
    bitrate?: string | undefined;
  };
}

export type VideoQualityOption = VideoQualityAutoOption | VideoQualityRenditionOption;

export interface VideoQualityOptionsResult {
  state: QualityRadioGroupCore.State;
  label: string;
  availability: QualityRadioGroupCore.State['availability'];
  value: string;
  selectedLabel: string;
  options: VideoQualityOption[];
  disabled: boolean;
  hidden: boolean;
  setValue: (value: string) => void;
}

const useVideoQualityRadioOptions = createRadioOptionsHook({
  name: 'useVideoQualityOptions',
  feature: 'quality',
  selector: selectQuality,
  createCore: () => new QualityRadioGroupCore(),
});

/**
 * Create video quality menu options, including an `Auto` option, from the
 * player video rendition state. Returns `null` when the quality feature is not
 * configured.
 *
 * @param props - Optional `label`, `formatRendition`, and `disabled` overrides.
 */
export function useVideoQualityOptions(props?: VideoQualityOptionsProps): VideoQualityOptionsResult | null {
  'use no memo';

  const result = useVideoQualityRadioOptions(props);
  const t = useTranslator();
  if (!result) return null;

  const { options, ...radioGroup } = result;

  return {
    ...radioGroup,
    options: options.map((option): VideoQualityOption => {
      if (option.kind === 'auto') {
        return { ...option, parts: { primary: option.label } };
      }

      return {
        ...option,
        parts: {
          ...option.parts,
          primary: translateText(option.parts.primary, t),
        },
      };
    }),
  };
}

export namespace useVideoQualityOptions {
  export type Props = VideoQualityOptionsProps;
  export type Result = VideoQualityOptionsResult;
  export type Option = VideoQualityOption;
}
