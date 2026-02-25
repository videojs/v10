import { createPlayer, features } from '../..';

const { Provider: AudioProvider } = createPlayer({
  features: features.audio,
});

export { AudioProvider };
export { Audio, type AudioProps } from '@/media/audio';
export * from './minimal-skin';
export * from './skin';
