interface HtmlPlayerInstance {
  play(): void;
  destroy(): void;
}

interface HtmlPlayerOptions {
  element: HTMLElement;
}

/** Create an HTML player instance. */
export function createPlayer(options: HtmlPlayerOptions): HtmlPlayerInstance {
  return {} as HtmlPlayerInstance;
}
