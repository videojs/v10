import type { RadioOption, RadioOptionsState } from '@videojs/core';
import { type Text, type TextParams, translateText } from '@videojs/core/i18n';
import type { UnknownState } from '@videojs/store';

import { useTranslator } from '../../i18n/context';
import { usePlayer } from '../../player/context';
import { useLogMissingFeature } from './use-log-missing-feature';

interface RadioOptionsCore<Props, Media, State extends RadioOptionsState> {
  setProps(props: Props): void;
  setMedia(media: Media): void;
  getState(): State;
  getLabel(state: State): Text | string;
  getLabelParams?(state: State): TextParams | undefined;
  selectValue(media: Media, value: string): void;
}

interface RadioOptionsHookConfig<Props, Media, State extends RadioOptionsState> {
  name: string;
  feature: string;
  selector: ((state: UnknownState) => Media | null) & { displayName?: string | undefined };
  createCore: () => RadioOptionsCore<Props, Media, State>;
}

type StateOption<State extends RadioOptionsState> = State extends RadioOptionsState<infer Option> ? Option : never;

export type TranslatedRadioOption<Option extends RadioOption> = Omit<Option, 'label' | 'labelParams' | 'disabled'> & {
  label: string;
  disabled: boolean;
};

export interface RadioOptionsHookResult<Option extends RadioOption, State extends RadioOptionsState> {
  state: State;
  label: string;
  value: string;
  selectedLabel: string;
  options: TranslatedRadioOption<Option>[];
  disabled: boolean;
  hidden: boolean;
  setValue: (value: string) => void;
}

/** Creates framework adapter mechanics shared by media-backed radio option hooks. */
export function createRadioOptionsHook<Props, Media, State extends RadioOptionsState>({
  name,
  feature,
  selector,
  createCore,
}: RadioOptionsHookConfig<Props, Media, State>): (
  props?: Props
) => RadioOptionsHookResult<StateOption<State>, State> | null {
  return function useRadioOptions(props?: Props): RadioOptionsHookResult<StateOption<State>, State> | null {
    const media = usePlayer(selector);
    const t = useTranslator();

    // A render-local core keeps the projection pure: it derives only from this render's props and media, so nothing
    // leaks from abandoned renders and memoizing compilers may cache it safely.
    const core = createCore();

    core.setProps(props ?? ({} as Props));

    const setValue = (value: string) => core.selectValue(media!, value);

    useLogMissingFeature(!media, name, selector.displayName ?? feature);

    if (!media) return null;

    core.setMedia(media);
    const state = core.getState();
    const options = state.options.map((option) => {
      const { label, labelParams, disabled, ...rest } = option;

      return {
        ...rest,
        label: translateText(label, t, labelParams),
        disabled: state.disabled || disabled,
      } as TranslatedRadioOption<StateOption<State>>;
    });

    return {
      state,
      label: translateText(core.getLabel(state), t, core.getLabelParams?.(state)),
      value: state.value,
      selectedLabel: options.find((option) => option.value === state.value)?.label ?? '',
      options,
      disabled: state.disabled,
      hidden: state.hidden,
      setValue,
    };
  };
}
