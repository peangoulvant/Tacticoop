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
    // Complexité cyclomatique : 5 conseillé, 10 au maximum (QUALITE-ET-IMPLEMENTATION.md).
    files: ['src/**/*.{ts,tsx}'],
    rules: { complexity: ['error', 10] },
  },
  {
    // Import sous un nom : le lecteur voit d'où vient chaque fonction (QUALITE-ET-IMPLEMENTATION.md).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/engine/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration[source.value=/\\/engine$/] > ImportSpecifier',
          message: "Importer le moteur sous un nom : import * as engine from '…/engine'.",
        },
        {
          selector: 'ImportDeclaration[source.value=/\\/shared\\/labels$/] > ImportSpecifier',
          message: "Importer les libellés sous un nom : import * as labels from '…/shared/labels'.",
        },
        {
          selector: 'ImportDeclaration[source.value=/\\/shared\\/assets$/] > ImportSpecifier',
          message:
            "Importer les ressources sous un nom : import * as assets from '…/shared/assets'.",
        },
      ],
    },
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
