interface PlayerInstance {
  play(): void;
  pause(): void;
}

interface PlayerOptions {
  autoplay?: boolean;
}

/** Create a React player instance. */
export function createPlayer(options?: PlayerOptions): PlayerInstance {
  return {} as PlayerInstance;
}
