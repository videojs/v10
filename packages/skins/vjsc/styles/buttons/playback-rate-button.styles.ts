import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-playback-rate-button',
      utilities: "tabular-nums after:w-[4ch] after:content-[attr(data-rate)_'×']",
    },
  },
});
