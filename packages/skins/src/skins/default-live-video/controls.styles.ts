import { styles } from 'vjsc/styles';

export default styles({
  file: 'live-video/controls.css',
  rules: {
    spaced: {
      className: 'video-controls-spaced',
      utilities: 'gap-px',
    },
    captionsMenu: {
      className: 'video-controls-captions-menu',
      utilities: 'media-max-compact:hidden',
    },
  },
});
