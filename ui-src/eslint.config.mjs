import js from '@eslint/js';
import ts from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import nextPlugin from '@next/eslint-plugin-next';
import importPlugin from 'eslint-plugin-import';

export default ts.config(
    js.configs.recommended,
    ...ts.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: {
            'react': react,
            'react-hooks': reactHooks,
            'jsx-a11y': jsxA11y,
            '@next/next': nextPlugin,
            'import': importPlugin,
        },
        languageOptions: {
            parser: ts.parser,
            parserOptions: {
                project: './tsconfig.json',
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            // Next.js recommended rules
            ...nextPlugin.configs.recommended.rules,
            ...nextPlugin.configs['core-web-vitals'].rules,

            // React recommended rules
            ...react.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',

            // Typescript rules
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

            // Custom rules from previous .eslintrc.json
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'curly': ['error', 'all'],
            'eqeqeq': ['error', 'always'],
            'prefer-const': 'error',
        },
    },
    {
        ignores: ['.next/**', 'out/**', 'node_modules/**', '*.js'],
    }
);
