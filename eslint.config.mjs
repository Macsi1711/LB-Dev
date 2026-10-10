import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';

const WEB = 'apps/web/src';
const same = { feature: '{{ from.element.captured.feature }}' };
const other = { feature: '!{{ from.element.captured.feature }}' };
const inFeature = (type) => ({ to: { element: { type, captured: same } } });
const to = (type) => ({ to: { element: { type } } });
const INDEX = 'index.ts';
const MODULE = '*.module.{ts,tsx}';
const otherFeatureIndex = {
  to: { element: { type: 'feature', fileInternalPath: INDEX, captured: other } },
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-demo/**',
      '**/coverage/**',
      '**/database.types.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  // Capas de la web: ui → domain ← data, infra conectada por <feature>.module.tsx.
  // Si salta esta regla, se corrige el diseño, nunca la regla.
  {
    files: [`${WEB}/**/*.{ts,tsx}`],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: 'apps/web/tsconfig.json' } },
      'boundaries/include': [`${WEB}/**/*`],
      // Los elementos son carpetas. index.ts y *.module.tsx viven en la carpeta de la feature.
      'boundaries/elements': [
        { type: 'ui', partialMatch: false, pattern: `${WEB}/features/*/ui`, capture: ['feature'] },
        {
          type: 'domain',
          partialMatch: false,
          pattern: `${WEB}/features/*/domain`,
          capture: ['feature'],
        },
        {
          type: 'data',
          partialMatch: false,
          pattern: `${WEB}/features/*/data`,
          capture: ['feature'],
        },
        {
          type: 'feature',
          partialMatch: false,
          pattern: `${WEB}/features/*`,
          capture: ['feature'],
        },
        { type: 'infra', partialMatch: false, pattern: `${WEB}/infra` },
        { type: 'shared', partialMatch: false, pattern: `${WEB}/shared` },
        { type: 'app', partialMatch: false, pattern: WEB },
      ],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          policies: [
            // Paquetes externos: todos menos el dominio, que es TypeScript puro.
            {
              from: { element: { type: '!domain' } },
              allow: { to: { module: { origin: ['external', 'core'] } } },
            },
            {
              from: { element: { type: 'domain' } },
              allow: { to: { module: { source: 'vitest' } } },
            },
            { from: { element: { type: 'domain' } }, allow: [inFeature('domain'), to('shared')] },
            {
              from: { element: { type: 'ui' } },
              allow: [inFeature('domain'), to('shared'), otherFeatureIndex],
            },
            { from: { element: { type: 'data' } }, allow: [inFeature('domain'), to('shared')] },
            { from: { element: { type: 'infra' } }, allow: [to('shared')] },
            {
              // Composition root: conecta adaptadores de infra con los puertos del dominio.
              from: { element: { type: 'feature', fileInternalPath: MODULE } },
              allow: [
                inFeature('ui'),
                inFeature('domain'),
                inFeature('data'),
                to('infra'),
                to('shared'),
                otherFeatureIndex,
              ],
            },
            {
              // index.ts: única puerta de entrada a la feature.
              from: { element: { type: 'feature', fileInternalPath: INDEX } },
              allow: [inFeature('ui'), inFeature('domain'), to('shared')],
            },
            {
              from: { element: { type: 'app' } },
              allow: [
                { to: { element: { type: 'feature', fileInternalPath: INDEX } } },
                to('infra'),
                to('shared'),
              ],
            },
          ],
        },
      ],
    },
  },
);
