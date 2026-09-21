interface PlayerController<Store> {
  play(): void;
  destroy(): void;
  readonly store: Store;
}

interface Selector<State, Result> {
  (state: State): Result;
}

interface ConfiguredPlayerController<Store> {
  new (): PlayerController<Store>;
  new <Result>(selector: Selector<Store, Result>): PlayerController<Store>;
}

interface HtmlPlayerOptions {
  element: HTMLElement;
}

interface VideoPlayerStore {
  readonly mediaType: 'video';
}

interface CreatePlayerResult<Store> {
  PlayerController: ConfiguredPlayerController<Store>;
}

/** Create an HTML player instance. */
export function createPlayer(_options: HtmlPlayerOptions): CreatePlayerResult<VideoPlayerStore> {
  return {} as CreatePlayerResult<VideoPlayerStore>;
}
