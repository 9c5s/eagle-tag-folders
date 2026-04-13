import js from '@eslint/js';
import ts from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import configPrettier from '@vue/eslint-config-prettier';

export default ts.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/_locales/**',
      '*.config.ts',
      '*.config.js',
      'auto-imports.d.ts',
      'components.d.ts'
    ]
  },

  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
  configPrettier,

  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
        project: './tsconfig.json',
        extraFileExtensions: ['.vue']
      },
      globals: { eagle: 'readonly' }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/component-name-in-template-casing': ['error', 'PascalCase']
    }
  },

  {
    files: ['tests/**/*.{ts,js}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' }
  }
);
