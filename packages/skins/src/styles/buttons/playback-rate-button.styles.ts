import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  prefix: 'media-playback-rate-button',
  rules: {
    root: {
      utilities: "tabular-nums after:w-[4ch] after:content-[attr(data-rate)_'×']",
    },
  },
});
