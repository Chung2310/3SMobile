const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/SafeAreaModal.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'react-native',
          importNames: ['Modal'],
          message: 'Use SafeAreaModal from @/components/SafeAreaModal so Android dialogs respect system bars.',
        }],
      }],
    },
  },
]);
