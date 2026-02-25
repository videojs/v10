import { createPlayer, features } from '../..';

const { Provider: VideoProvider } = createPlayer({
  features: features.video,
});

export { VideoProvider };
export { Video, type VideoProps } from '@/media/video';
export * from './minimal-skin';
export * from './minimal-skin.tailwind';
export * from './skin';
export * from './skin.tailwind';
