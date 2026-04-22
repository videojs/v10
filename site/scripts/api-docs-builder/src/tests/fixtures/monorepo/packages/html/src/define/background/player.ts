/**
 * Mock HTML background player element.
 *
 * Exercises: player exclusion — has static tagName but class name
 * contains "Player", so it should NOT appear in skins or media elements.
 */
export class BackgroundVideoPlayerElement extends HTMLElement {
  static readonly tagName = 'background-video-player';
}
