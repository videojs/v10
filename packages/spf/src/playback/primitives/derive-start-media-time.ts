/**
 * The `startMediaTime` coordination seam — shared by the `establishStartMediaTime`
 * reactor (which owns the lifecycle and holds one of these as config) and the DOM-free
 * relocation pipelines that fill its state (`relocation-pipelines`). It lives here rather
 * than with the behavior because the pipelines are a lower layer and can't import from
 * `behaviors/`; a playback-domain contract (it names selected track ids), so not `media/`.
 * See `internal/design/spf/presentation-timeline-model.md`.
 */
import type { MediaContainerData } from '../../media/types';

/** The selected v/a track ids a {@link DeriveStartMediaTime} may coordinate across. */
export interface DeriveStartMediaTimeContext {
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

/**
 * Reduce the discovered {@link MediaContainerData} (keyed by track type) into each type's
 * `startMediaTime` origin; `undefined` means "not ready yet". Pure and injected — the single
 * coordination seam the reactor and the loader stamp share.
 */
export type DeriveStartMediaTime = (
  containerData: Record<string, MediaContainerData>,
  ctx: DeriveStartMediaTimeContext
) => Record<string, number | undefined>;
