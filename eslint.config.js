import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    // Le moteur reste indépendant de React, Zustand, MUI et IndexedDB (STRUCTURE.md).
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react',
            'react-dom',
            'zustand',
            '@mui/*',
            '**/store/*',
            '**/features/*',
            '**/persistence/*',
          ],
        },
      ],
    },
  },
);
