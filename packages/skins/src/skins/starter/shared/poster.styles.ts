import { styles } from 'vjsc/styles';

export default styles({
  file: 'poster.css',
  prefix: 'media-poster',
  rules: {
    root: {
      utilities: 'absolute inset-0 size-full not-data-visible:hidden',
    },
    image: {
      utilities: 'size-full object-media',
    },
  },
});
