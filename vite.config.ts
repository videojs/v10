import { defineConfig } from 'vite-plus';

const ignoredPaths = [
  '**/.astro/**',
  '**/.netlify/**',
  '**/.pnpm-store/**',
  '**/.vercel/**',
  '**/.vite/**',
  '**/.next/**',
  '**/.agents/**',
  '**/.claude/**',
  '**/.vite-hooks/**',
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
  'tools/oxlint/anti-slop/**',
];

export default defineConfig({
  fmt: {
    arrowParens: 'always',
    bracketSpacing: true,
    ignorePatterns: ignoredPaths,
    printWidth: 120,
    semi: true,
    singleQuote: true,
    sortImports: true,
    sortPackageJson: true,
    sortTailwindcss: true,
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
    jsPlugins: [{ name: 'anti-slop', specifier: './tools/oxlint/anti-slop/index.ts' }],
    plugins: ['typescript', 'react'],
    options: {
      typeAware: false,
      typeCheck: false,
    },
    rules: {
      // Reject anti-slop violations in owned source.
      'anti-slop/no-chained-type-assertions': 'error',
      'anti-slop/no-conditional-empty-object-spread': 'error',
      'anti-slop/no-known-value-widening': 'error',
      'anti-slop/no-module-mocking': 'error',
      'anti-slop/no-object-parameters': 'error',
      'anti-slop/no-reflect-apply': 'error',
      'anti-slop/no-reflect-get': 'error',
      'anti-slop/no-runtime-typeof': ['error', { allowInTypeGuards: true }],
      'anti-slop/no-shape-in-symbol-names': 'error',
      'anti-slop/no-unknown-parameters': 'error',
      'anti-slop/no-unknown-returns': 'error',
      'anti-slop/no-unknown-type-aliases': 'error',
      'anti-slop/no-unsafe-dictionary-type': 'error',
      'anti-slop/no-widen-then-assert': 'error',
      'anti-slop/require-safety-comment-for-type-assertion': 'error',
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
    tasks: {
      'prepare:dev': {
        command: 'node -e ""',
        cache: false,
        dependsOn: ['site#api-docs:generate', 'site#ejected-skins', 'site#cdn-manifest', '@videojs/sandbox#setup'],
      },
    },
  },
  staged: {
    'packages/icons/src/assets/**/*.svg': 'node --import tsx packages/icons/scripts/format-icons.ts',
    '*': 'vp check --fix --no-error-on-unmatched-pattern',
  },
});
