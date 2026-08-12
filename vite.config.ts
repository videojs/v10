import { defineConfig } from 'vite-plus';

const ignoredPaths = [
  '**/.astro/**',
  '**/.netlify/**',
  '**/.pnpm-store/**',
  '**/.vercel/**',
  '**/.vite/**',
  '**/.next/**',
  '**/.opencode/**',
  '**/.github/**',
  '**/*.md',
  '**/*.mdx',
  '**/*.toml',
  '**/build/AGENTS.md',
  '**/build/agents/**',
  '**/dist/**',
  '**/examples/**',
  'site/scripts/api-docs-builder/src/tests/fixtures/**',
  '**/packages/html/cdn/**',
  '**/styles/vjs.css',
  '**/packages/*/types/**',
  'packages/core/src/core/ui/components.generated.ts',
];

export default defineConfig({
  fmt: {
    arrowParens: 'always',
    bracketSpacing: true,
    ignorePatterns: ignoredPaths,
    printWidth: 120,
    semi: true,
    singleQuote: true,
    sortImports: false,
    sortPackageJson: false,
    sortTailwindcss: false,
    tabWidth: 2,
    trailingComma: 'es5',
    useTabs: false,
    overrides: [
      {
        files: ['**/*.astro'],
        options: {
          sortTailwindcss: {
            stylesheet: './site/src/styles/globals.css',
            functions: ['clsx'],
          },
        },
      },
      {
        files: ['**/*.css'],
        options: {
          singleQuote: false,
        },
      },
    ],
  },
  lint: {
    ignorePatterns: ignoredPaths,
    plugins: ['typescript', 'react'],
    options: {
      typeAware: false,
      typeCheck: false,
    },
    rules: {
      'array-callback-return': 'off',
      'no-cond-assign': 'off',
      'no-unused-vars': [
        'warn',
        {
          args: 'none',
          fix: { imports: 'safe-fix', variables: 'off' },
        },
      ],
      'prefer-rest-params': 'off',
      'react/exhaustive-deps': 'warn',
      'react/jsx-no-useless-fragment': 'warn',
      'react/no-unknown-property': ['error', { ignore: ['corner-shape'] }],
      'typescript/no-confusing-void-expression': 'off',
      'typescript/no-explicit-any': 'off',
      'typescript/no-namespace': 'off',
      'typescript/no-non-null-assertion': 'off',
      'unicorn/no-document-cookie': 'off',
      'unicorn/no-thenable': 'off',
    },
    overrides: [
      {
        files: ['site/src/**'],
        excludeFiles: ['site/src/utils/twMerge.ts'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              paths: [
                {
                  name: 'tailwind-merge',
                  message: "Use '@/utils/twMerge' instead — it's configured for our custom theme.",
                },
              ],
            },
          ],
        },
      },
      {
        files: ['**/*.astro'],
        rules: {
          'no-unused-vars': 'off',
          'prefer-const': 'off',
          'typescript/consistent-type-imports': 'off',
        },
      },
      {
        files: ['build/plugins/tests/**'],
        rules: {
          'no-template-curly-in-string': 'off',
        },
      },
    ],
  },
  run: {
    cache: {
      scripts: true,
      tasks: true,
    },
  },
  staged: {
    'packages/icons/src/assets/**/*.svg': 'node --import tsx packages/icons/scripts/format-icons.ts',
    '*': 'vp check --fix --no-error-on-unmatched-pattern',
  },
});
