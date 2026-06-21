import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';

import type { MediaQualityState, MediaVideoRendition } from '../../media/state';
import type { ButtonState } from '../types';
import {
  formatBitrate,
  formatRenditionLabel,
  getRenditionSize,
  QUALITY_RADIO_GROUP_DEFAULT_PROPS,
  type QualityRadioGroupProps,
} from './props';

export interface QualityRadioGroupRendition {
  value: string;
  label: string;
  tier?: string | undefined;
  badge?: string | undefined;
}

export interface QualityRadioGroupState extends ButtonState {
  renditions: readonly QualityRadioGroupRendition[];
  autoLabel: string;
  value: string;
  disabled: boolean;
  availability: 'available' | 'unavailable';
}

export const QUALITY_AUTO_VALUE = 'auto';

function hasSameSize(rendition: MediaVideoRendition, renditions: readonly MediaVideoRendition[]): boolean {
  const size = getRenditionSize(rendition);
  return Boolean(size && renditions.some((other) => other !== rendition && getRenditionSize(other) === size));
}

function formatRenditionBadge(
  rendition: MediaVideoRendition,
  renditions: readonly MediaVideoRendition[] = []
): string | undefined {
  if (!getRenditionSize(rendition) || !rendition.bitrate || !hasSameSize(rendition, renditions)) return undefined;
  return formatBitrate(rendition.bitrate);
}

function formatRenditionTier(rendition: MediaVideoRendition): string | undefined {
  const size = getRenditionSize(rendition);

  if (!size) return undefined;
  if (size >= 4320) return '8K';
  if (size >= 2160) return '4K';
  if (size >= 1080) return 'HD';

  return undefined;
}

function getRenditionValue(rendition: MediaVideoRendition, index: number): string {
  return rendition.id || String(index);
}

function isSameRendition(a: MediaVideoRendition, b: MediaVideoRendition): boolean {
  if (a.id !== undefined || b.id !== undefined) return a.id === b.id;

  return (
    a.width === b.width &&
    a.height === b.height &&
    a.bitrate === b.bitrate &&
    a.frameRate === b.frameRate &&
    a.codec === b.codec
  );
}

export class QualityRadioGroupCore {
  static readonly defaultProps = QUALITY_RADIO_GROUP_DEFAULT_PROPS;

  readonly state = createState<QualityRadioGroupState>({
    renditions: [],
    autoLabel: 'Auto',
    value: QUALITY_AUTO_VALUE,
    disabled: false,
    availability: 'unavailable',
    label: '',
  });

  #props = { ...QualityRadioGroupCore.defaultProps };
  #media: MediaQualityState | null = null;

  constructor(props?: QualityRadioGroupProps) {
    if (props) this.setProps(props);
  }

  setProps(props: QualityRadioGroupProps): void {
    this.#props = defaults(props, QualityRadioGroupCore.defaultProps);
  }

  getLabel(state: QualityRadioGroupState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return 'Quality';
  }

  getRenditionLabel(rendition: MediaVideoRendition): string {
    if (this.#props.formatRendition !== QualityRadioGroupCore.defaultProps.formatRendition) {
      return this.#props.formatRendition(rendition);
    }

    return formatRenditionLabel(rendition);
  }

  getRenditionBadge(
    rendition: MediaVideoRendition,
    renditions: readonly MediaVideoRendition[] = []
  ): string | undefined {
    if (this.#props.formatRendition !== QualityRadioGroupCore.defaultProps.formatRendition) return undefined;

    return formatRenditionBadge(rendition, renditions);
  }

  getRenditionTier(rendition: MediaVideoRendition): string | undefined {
    if (this.#props.formatRendition !== QualityRadioGroupCore.defaultProps.formatRendition) return undefined;

    return formatRenditionTier(rendition);
  }

  getRenditionValue(rendition: MediaVideoRendition, index: number): string {
    return getRenditionValue(rendition, index);
  }

  getAttrs(state: QualityRadioGroupState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': state.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaQualityState): void {
    this.#media = media;
  }

  getState(): QualityRadioGroupState {
    const media = this.#media!;
    const selectedIndex = media.videoRenditionList.findIndex((rendition) => rendition.selected);
    const availability: QualityRadioGroupState['availability'] =
      media.videoRenditionList.length > 1 ? 'available' : 'unavailable';
    const toRendition = (rendition: MediaVideoRendition, index: number): QualityRadioGroupRendition => {
      const tier = this.getRenditionTier(rendition);
      const badge = this.getRenditionBadge(rendition, media.videoRenditionList);

      return {
        value: this.getRenditionValue(rendition, index),
        label: this.getRenditionLabel(rendition),
        ...(tier && { tier }),
        ...(badge && { badge }),
      };
    };
    const activeIndex =
      media.activeVideoRendition === null
        ? -1
        : media.videoRenditionList.findIndex((rendition) => isSameRendition(rendition, media.activeVideoRendition!));
    const active =
      media.activeVideoRendition && activeIndex !== -1
        ? toRendition(media.activeVideoRendition, activeIndex)
        : undefined;

    this.state.patch({
      renditions: media.videoRenditionList.map(toRendition),
      autoLabel: selectedIndex === -1 && active ? `Auto (${active.label})` : 'Auto',
      value:
        selectedIndex === -1
          ? QUALITY_AUTO_VALUE
          : this.getRenditionValue(media.videoRenditionList[selectedIndex]!, selectedIndex),
      disabled: this.#props.disabled || availability === 'unavailable',
      availability,
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  select(media: MediaQualityState, value: string): void {
    if (this.#props.disabled) return;

    if (value === QUALITY_AUTO_VALUE) {
      media.selectVideoRendition(value);
      return;
    }

    const hasValue = media.videoRenditionList.some(
      (rendition, index) => this.getRenditionValue(rendition, index) === value
    );
    if (!hasValue) return;

    media.selectVideoRendition(value);
  }

  selectValue(media: MediaQualityState, value: string): void {
    this.select(media, value);
  }
}

export namespace QualityRadioGroupCore {
  export type Props = QualityRadioGroupProps;
  export type State = QualityRadioGroupState;
}
