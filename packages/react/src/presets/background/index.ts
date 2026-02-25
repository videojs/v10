import { createPlayer, features } from '../..';

const { Provider: BackgroundVideoProvider } = createPlayer({
  features: features.background,
});

export { BackgroundVideoProvider };
export { BackgroundVideo, type BackgroundVideoProps } from '@/media/background-video';
export * from './skin';
