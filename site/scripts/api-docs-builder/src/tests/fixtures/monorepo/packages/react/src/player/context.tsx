interface PlayerStore {
  playing: boolean;
  volume: number;
}

interface StoreState {
  playing: boolean;
  volume: number;
}

/** Access the player store or select state from it. */
export function usePlayer(): PlayerStore;
export function usePlayer<R>(selector: (state: StoreState) => R): R;
export function usePlayer<R>(selector?: (state: StoreState) => R): PlayerStore | R {
  return {} as PlayerStore | R;
}
