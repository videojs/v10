import { styles } from 'vjsc/styles';

export default styles({
  file: 'audio/skin.css',
  prefix: 'audio-skin',
  rules: {
    root: {
      scopeRoot: true,
      utilities: 'h-auto! overflow-visible! bg-transparent! [container-type:inline-size]! after:hidden',
    },
  },
});
