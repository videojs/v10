import { styles } from 'vjsc/styles';

export default styles({
  file: 'complex.css',
  rules: {
    root: { className: 'media-root', utilities: ['[&_img]:block', '[&_video]:block'] },
  },
});
