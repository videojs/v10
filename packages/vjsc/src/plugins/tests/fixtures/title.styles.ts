import { styles } from 'vjsc/styles';

export default styles({
  file: 'title.css',
  rules: {
    root: {
      className: 'fixture-title',
      utilities: 'text-fixture-title font-medium text-fixture-foreground',
      variants: { minimal: 'font-normal' },
    },
  },
});
