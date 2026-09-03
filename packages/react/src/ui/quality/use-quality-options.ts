import {
  type QualityRadioGroupAutoOption,
  QualityRadioGroupCore,
  type QualityRadioGroupRenditionOption,
} from '@videojs/core';
import { selectQuality } from '@videojs/core/dom';
import { translateText } from '@videojs/core/i18n';

import { useTranslator } from '../../i18n/context';
import { createRadioOptionsHook, type TranslatedRadioOption } from '../hooks/create-radio-options-hook';

export interface QualityOptionsProps extends QualityRadioGroupCore.Props {}

/** Translated display parts of a quality option, for designs that style the pieces separately. */
export interface QualityOptionParts {
  /** Main visible text, such as `1080p` or `Auto (720p)`. */
  primary: string;
  /** Resolution tier such as `HD`, `4K`, or `8K`. */
  tier?: string | undefined;
  /** Bitrate text, present only when renditions share a size and need disambiguating. */
  bitrate?: string | undefined;
}

export interface QualityAutoOption extends Omit<TranslatedRadioOption<QualityRadioGroupAutoOption>, 'parts'> {
  parts: QualityOptionParts;
}

export interface QualityRenditionOption extends Omit<TranslatedRadioOption<QualityRadioGroupRenditionOption>, 'parts'> {
  parts: QualityOptionParts;
}

export type QualityOption = QualityAutoOption | QualityRenditionOption;

export interface QualityOptionsResult {
  state: QualityRadioGroupCore.State;
  label: string;
  availability: QualityRadioGroupCore.State['availability'];
  value: string;
  selectedLabel: string;
  options: QualityOption[];
  disabled: boolean;
  hidden: boolean;
  setValue: (value: string) => void;
}

const useQualityRadioOptions = createRadioOptionsHook({
  name: 'useQualityOptions',
  feature: 'quality',
  selector: selectQuality,
  createCore: () => new QualityRadioGroupCore(),
});

/**
 * Create quality menu options (including an `Auto` option) from the player video rendition state. Returns `null` when
 * the quality feature is not configured.
 *
 * Each option's `label` is a complete accessible label. Use `parts` when the design styles the primary text, tier, and
 * bitrate separately.
 *
 * @param props - Optional `label`, `formatRendition`, and `disabled` overrides.
 */
export function useQualityOptions(props?: QualityOptionsProps): QualityOptionsResult | null {
  'use no memo';

  const result = useQualityRadioOptions(props);
  const t = useTranslator();

  if (!result) return null;

  const { options, ...radioGroup } = result;

  return {
    ...radioGroup,
    options: options.map(
      (option): QualityOption => ({
        ...option,
        parts: {
          ...option.parts,
          // The automatic label interpolates the active rendition, so reuse the fully translated label.
          primary: option.kind === 'auto' ? option.label : translateText(option.parts.primary, t),
        },
      })
    ),
  };
}

export namespace useQualityOptions {
  export type Props = QualityOptionsProps;
  export type Result = QualityOptionsResult;
  export type Option = QualityOption;
}
