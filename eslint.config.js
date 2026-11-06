import { readdirSync } from 'node:fs';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// Features de l'application : chacune n'expose que son index.ts aux autres.
const features = readdirSync('src/features', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const deepImportMessage = (name) =>
  `Importer la feature « ${name} » uniquement via son index.ts (pas d'import profond).`;

const persistenceMessage =
  'Seul le store utilise la persistance : passer par une action du store (STRUCTURE.md).';

const featureIndexOnlyPattern = {
  group: ['**/features/*/**'],
  message: "Importer une feature uniquement via son index.ts (pas d'import profond).",
};

const persistencePattern = {
  group: ['**/persistence', '**/persistence/**'],
  message: persistenceMessage,
};

const labelEngineImportRule = {
  selector: 'ImportDeclaration[source.value=/\\/shared\\/label-engine$/] > ImportSpecifier',
  message:
    "Importer les textes du moteur sous un nom : import * as labelEngine from '…/shared/label-engine'.",
};

// Style des fonctions (Google TypeScript Style Guide) : au premier niveau d'un module, une
// fonction est une déclaration `function`. Les flèches restent pour les rappels et les
// expressions. Exception : une constante annotée d'un type de fonction (`Handler<'X'>`).
const topLevelFunctionStyleRules = [
  'Program > VariableDeclaration',
  'Program > ExportNamedDeclaration > VariableDeclaration',
].map((declaration) => ({
  selector: `${declaration} > VariableDeclarator:not([id.typeAnnotation]) > :matches(ArrowFunctionExpression, FunctionExpression)`,
  message:
    'Au premier niveau d’un module, déclarer la fonction avec `function nom() {}` (une constante annotée d’un type reste permise).',
}));

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
        labelEngineImportRule,
        ...topLevelFunctionStyleRules,
        {
          selector: 'ImportDeclaration[source.value=/\\/shared\\/assets$/] > ImportSpecifier',
          message:
            "Importer les ressources sous un nom : import * as assets from '…/shared/assets'.",
        },
      ],
    },
  },
  {
    // App, shared… : seul l'index.ts d'une feature est importable, et la persistance est réservée
    // au store (le démarrage appelle une action du store, il n'importe pas `persistence`).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/features/**', 'src/engine/**', 'src/store/**', 'src/persistence/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [featureIndexOnlyPattern, persistencePattern] },
      ],
    },
  },
  {
    // Le store est la seule couche qui utilise la persistance (features → store → persistence).
    files: ['src/store/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [featureIndexOnlyPattern] }] },
  },
  {
    // La persistance ne dépend que du moteur : jamais du store, des features ni de l'app, ce qui
    // garde le sens unique store → persistence et exclut tout cycle.
    files: ['src/persistence/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/store',
                '**/store/**',
                '**/features',
                '**/features/**',
                '**/app',
                '**/app/**',
              ],
              message:
                'La persistance ne dépend que du moteur : ni store, ni features, ni app (STRUCTURE.md).',
            },
          ],
        },
      ],
    },
  },
  // Dans chaque feature : les autres features ne s'importent que par leur index.ts, et la
  // persistance est réservée au store (features → store → persistence, STRUCTURE.md).
  ...features.map((feature) => ({
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...features
              .filter((other) => other !== feature)
              .map((other) => ({ group: [`**/${other}/**`], message: deepImportMessage(other) })),
            persistencePattern,
          ],
        },
      ],
    },
  })),
  {
    // Le moteur importe les textes de shared/label-engine sous un nom (comme les autres couches) ;
    // il suit aussi le style des fonctions.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', labelEngineImportRule, ...topLevelFunctionStyleRules],
    },
  },
  {
    // Le moteur reste indépendant de React, Zustand, MUI et IndexedDB (STRUCTURE.md). Dans
    // shared/, il n'utilise que label-engine : labels et assets dépendent du moteur.
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
            '**/shared/labels',
            '**/shared/assets',
          ],
        },
      ],
    },
  },
);
