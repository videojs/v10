export default {
  extends: ['@commitlint/config-conventional'],
  formatter: '@commitlint/format',
  ignores: [
    /** @param {string} message */
    (message) => {
      const lower = message.toLowerCase().trim();
      return ['wip'].some((word) => lower.startsWith(word));
    },
  ],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'cd',
        'ci',
        'claude',
        'core',
        'design',
        'docs',
        'html',
        'icons',
        'packages',
        'plan',
        'react-native',
        'react',
        'rfc',
        'root',
        'sandbox',
        'site',
        'store',
        'test',
        'utils',
      ],
    ],
  },
};
