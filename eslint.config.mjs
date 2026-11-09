import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**', 'dist-api/**', 'node_modules/**'] },
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ['apps/**/*.{ts,tsx}', 'clients/**/*.ts', 'packages/**/*.ts', 'scripts/**/*.ts', 'tests/**/*.{ts,mts}'],
  })),
];
