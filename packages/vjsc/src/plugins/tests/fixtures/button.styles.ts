import { styles } from 'vjsc/styles';

const base = ['grid border-0', 'p-3'];

export default styles({
  file: 'components/button.css',
  layer: 'fixture.components',
  description: 'Shared fixture button styles.',
  rules: {
    root: {
      className: 'fixture-button',
      utilities: base,
      variants: {
        compact: 'p-1',
        disabled: 'pointer-events-none',
      },
    },
    icon: {
      className: 'fixture-button-icon',
      utilities: 'size-4',
    },
  },
});
