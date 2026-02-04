import type { AnySlice, Slice, Store, UnionSliceState } from '@videojs/store';

export interface Media extends HTMLMediaElement {}

export interface MediaContainer extends HTMLElement {}

export interface PlayerTarget {
  media: Media;
  container: MediaContainer | null;
}

export type { FeatureAvailability } from '../../core/media/state';

export type PlayerFeature<State> = Slice<PlayerTarget, State>;

export type AnyPlayerFeature = AnySlice<PlayerTarget>;

export type PlayerStore<Features extends AnyPlayerFeature[] = []> = Store<PlayerTarget, UnionSliceState<Features>>;

export type AnyPlayerStore = Store<PlayerTarget, object>;
