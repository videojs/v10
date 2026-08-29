import { styles } from 'vjsc/styles';

export default styles({
  file: 'skin.css',
  rules: {
    root: {
      className: 'media-audio-skin',
      scopeRoot: true,
      utilities: 'h-auto! overflow-visible! bg-transparent! [container-type:inline-size]! after:hidden!',
    },
  },
});
