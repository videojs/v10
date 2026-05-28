import * as dashjs from 'dashjs';
import { HTMLVideoElementHost } from '../html-video-element-host';

export interface DashMediaProps {
  src: string;
}

export const dashMediaDefaultProps: DashMediaProps = {
  src: '',
};

export class DashMedia extends HTMLVideoElementHost implements DashMediaProps {
  #engine: dashjs.MediaPlayerClass;
  #src = dashMediaDefaultProps.src;
  #pendingLoad: Promise<void> | null = null;

  constructor() {
    super();
    this.#engine = dashjs.MediaPlayer().create();
    this.#engine.initialize(undefined, undefined, false);
  }

  override get target() {
    return super.target;
  }

  override set target(value: HTMLVideoElement | null) {
    super.target = value;
    this.#engine.attachView(value as HTMLVideoElement);
    if (value) this.#requestLoad();
  }

  override get engine(): dashjs.MediaPlayerClass {
    return this.#engine;
  }

  get src() {
    return this.#src;
  }

  set src(value) {
    this.#src = value;
    this.#requestLoad();
  }

  load() {
    this.#pendingLoad = null;
    this.#engine.attachSource(this.#src);
  }

  destroy() {
    super.destroy();
    this.#engine.destroy();
  }

  async #requestLoad() {
    if (this.#pendingLoad) return;
    this.#pendingLoad = Promise.resolve();
    await this.#pendingLoad;
    if (this.#pendingLoad === null) return;
    this.root.load();
  }
}
