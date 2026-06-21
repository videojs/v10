import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaVideoRendition } from '../../media/state';
import type { QualityRadioGroupState } from './quality-radio-group-core';

export interface QualityRadioGroupProps {
  /** Custom label for the options group. */
  label?: string | ((state: QualityRadioGroupState) => string) | undefined;
  /** Custom formatter for visible rendition labels. */
  formatRendition?: ((rendition: MediaVideoRendition) => string) | undefined;
  /** Whether quality selection is disabled. */
  disabled?: boolean | undefined;
}

const STANDARD_RENDITION_SIZES: readonly number[] = [4320, 2160, 1440, 1080, 720, 480, 360, 240];

export function formatBitrate(bitrate: number): string {
  return bitrate >= 1_000_000 ? `${Math.round(bitrate / 100_000) / 10} Mbps` : `${Math.round(bitrate / 1000)} kbps`;
}

function getWidescreenSize(width: number): number | undefined {
  const size = Math.round((width * 9) / 16);
  return STANDARD_RENDITION_SIZES.includes(size) ? size : undefined;
}

export function getRenditionSize(rendition: MediaVideoRendition): number | undefined {
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

export function formatRenditionLabel(rendition: MediaVideoRendition): string {
  const size = getRenditionSize(rendition);
  if (size) return `${size}p`;
  if (rendition.bitrate) return formatBitrate(rendition.bitrate);
  return 'Quality';
}

export const QUALITY_RADIO_GROUP_DEFAULT_PROPS: NonNullableObject<QualityRadioGroupProps> = {
  label: '',
  formatRendition: formatRenditionLabel,
  disabled: false,
};
