import { styles } from 'vjsc/styles';

const icon = ['hidden shrink-0'] as const;

const iconVariants = {
  default: ['mix-blend-difference'],
  minimal: ['drop-shadow-media-icon'],
} as const;

export default styles({
  file: 'indicators.css',
  rules: {
    root: {
      className: 'media-status-indicator',
      utilities: 'group/input-status',
    },
    content: {
      className: 'media-status-indicator-content',
      utilities: 'flex',
      variants: { default: 'w-full' },
    },
    captionsOnIcon: {
      className: 'media-status-indicator-captions-on-icon',
      utilities: [...icon, 'group-data-[status=captions-on]/input-status:block'],
      variants: iconVariants,
    },
    captionsOffIcon: {
      className: 'media-status-indicator-captions-off-icon',
      utilities: [...icon, 'group-data-[status=captions-off]/input-status:block'],
      variants: iconVariants,
    },
    fullscreenEnterIcon: {
      className: 'media-status-indicator-fullscreen-enter-icon',
      utilities: [...icon, 'group-data-[status=fullscreen]/input-status:block'],
      variants: iconVariants,
    },
    fullscreenExitIcon: {
      className: 'media-status-indicator-fullscreen-exit-icon',
      utilities: [...icon, 'group-data-[status=exit-fullscreen]/input-status:block'],
      variants: iconVariants,
    },
    pipEnterIcon: {
      className: 'media-status-indicator-pip-enter-icon',
      utilities: [...icon, 'group-data-[status=pip]/input-status:block'],
      variants: iconVariants,
    },
    pipExitIcon: {
      className: 'media-status-indicator-pip-exit-icon',
      utilities: [...icon, 'group-data-[status=exit-pip]/input-status:block'],
      variants: iconVariants,
    },
    value: {
      className: 'media-status-indicator-value',
      utilities: 'ml-auto',
      variants: { default: 'mix-blend-difference' },
    },
  },
});
