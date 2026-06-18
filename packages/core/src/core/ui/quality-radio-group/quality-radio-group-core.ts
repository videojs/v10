import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaQualityState, MediaVideoRendition } from '../../media/state';
import type { ButtonState } from '../types';

export interface QualityRadioGroupProps {
  /** Custom label for the options group. */
  label?: string | ((state: QualityRadioGroupState) => string) | undefined;
  /** Custom formatter for visible rendition labels. */
  formatRendition?: ((rendition: MediaVideoRendition) => string) | undefined;
  /** Whether quality selection is disabled. */
  disabled?: boolean | undefined;
}

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

const STANDARD_RENDITION_SIZES: readonly number[] = [4320, 2160, 1440, 1080, 720, 480, 360, 240];

function formatBitrate(bitrate: number): string {
  return bitrate >= 1_000_000 ? `${Math.round(bitrate / 100_000) / 10} Mbps` : `${Math.round(bitrate / 1000)} kbps`;
}

function getWidescreenSize(width: number): number | undefined {
  const size = Math.round((width * 9) / 16);
  return STANDARD_RENDITION_SIZES.includes(size) ? size : undefined;
}

function getRenditionSize(rendition: MediaVideoRendition): number | undefined {
  const { width, height } = rendition;

  if (width && height) {
    // 4:3 and portrait renditions use their actual vertical-ish size. For wider-than-16:9
    // cinematic encodes, snap to a known 16:9 class only when the width maps cleanly.
    if (width > height && width * 9 > height * 16) return getWidescreenSize(width) ?? height;
    return Math.min(width, height);
  }

  if (height) return height;
  if (width) return getWidescreenSize(width) ?? width;

  return undefined;
}

function hasSameSize(rendition: MediaVideoRendition, renditions: readonly MediaVideoRendition[]): boolean {
  const size = getRenditionSize(rendition);
  return Boolean(size && renditions.some((other) => other !== rendition && getRenditionSize(other) === size));
}

function formatRenditionLabel(rendition: MediaVideoRendition): string {
  const size = getRenditionSize(rendition);
  if (size) return `${size}p`;
  if (rendition.bitrate) return formatBitrate(rendition.bitrate);
  return 'Quality';
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
  static readonly defaultProps: NonNullableObject<QualityRadioGroupProps> = {
    label: '',
    formatRendition: formatRenditionLabel,
    disabled: false,
  };

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
