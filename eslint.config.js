import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const restrictedSyntax = [
  {
    selector: "NewExpression[callee.name='BrowserWindow']",
    message: 'Construct remote windows through remote-window-factory.ts.',
  },
  {
    selector: "NewExpression[callee.name='WebContentsView']",
    message: 'Construct remote views through the approved factory.',
  },
  {
    selector: "NewExpression[callee.name='BrowserView']",
    message: 'Construct remote views through the approved factory.',
  },
  {
    selector: "Property[key.name='preload']",
    message: 'Remote content must not receive a preload script.',
  },
  {
    selector:
      "CallExpression[callee.object.name='shell'][callee.property.name='openExternal']",
    message: 'Use the validated external-open module.',
  },
  {
    selector: "CallExpression[callee.property.name='getLastWebPreferences']",
    message: 'Do not use undocumented web preference inspection.',
  },
  {
    selector: "Property[key.name='nodeIntegration'][value.value=true]",
    message: 'nodeIntegration must remain disabled.',
  },
  {
    selector: "Property[key.name='contextIsolation'][value.value=false]",
    message: 'contextIsolation must remain enabled.',
  },
  {
    selector: "Property[key.name='sandbox'][value.value=false]",
    message: 'sandbox must remain enabled.',
  },
  {
    selector: "Property[key.name='webSecurity'][value.value=false]",
    message: 'webSecurity must remain enabled.',
  },
];

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['.vite/**', 'out/**', 'dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{ts,tsx,js}'],
    rules: {
      'no-restricted-syntax': ['error', ...restrictedSyntax],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/main/security/remote-window-factory.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Identifier[name='webPreferences']",
          message: 'Define webPreferences only in remote-window-factory.ts.',
        },
      ],
    },
  },
  {
    files: ['src/main/**/*.ts'],
    ignores: ['src/main/security/external-open.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='shell'][callee.property.name='openExternal']",
          message: 'Use the validated external-open module.',
        },
      ],
    },
  },
  {
    files: ['src/main/security/policy/*.ts'],
    ignores: ['src/main/security/policy/index.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/navigation-allowlist', '**/permission-origins'],
              message: 'Policy tables are owned by policy/index.ts.',
            },
          ],
        },
      ],
    },
  },
);
