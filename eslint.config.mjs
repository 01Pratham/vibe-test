import js from '@eslint/js';
import ts from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default ts.config(
    js.configs.recommended,
    ...ts.configs.recommended,
    {
        files: ['**/*.ts'],
        plugins: {
            'import': importPlugin,
        },
        languageOptions: {
            parser: ts.parser,
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        rules: {
            // TypeScript Rules
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',
            '@typescript-eslint/no-unsafe-argument': 'error',
            '@typescript-eslint/explicit-function-return-type': [
                'error',
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                    allowHigherOrderFunctions: true,
                },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/prefer-nullish-coalescing': 'error',
            '@typescript-eslint/prefer-optional-chain': 'error',
            '@typescript-eslint/strict-boolean-expressions': [
                'warn',
                {
                    allowString: false, // Strict
                    allowNumber: false,
                    allowNullableObject: true,
                    allowNullableBoolean: true,
                    allowNullableString: false,
                    allowNullableNumber: false,
                    allowAny: false,
                },
            ],
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                },
            ],

            // Code Quality
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-var': 'error',
            'prefer-const': 'error',
            'curly': ['error', 'all'],
            'eqeqeq': ['error', 'always'],

            // Import Rules
            'import/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],

            // Complexity
            'complexity': ['warn', 15],
            'max-depth': ['warn', 4],
            'max-lines-per-function': ['warn', 150],
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'default',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow',
                },
                {
                    selector: 'variable',
                    format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
                    leadingUnderscore: 'allow',
                },
                {
                    selector: 'parameter',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow',
                },
                {
                    selector: 'property',
                    format: ['camelCase', 'snake_case', 'UPPER_CASE'],
                    leadingUnderscore: 'allow',
                },
                {
                    selector: 'typeLike',
                    format: ['PascalCase'],
                },
            ],
        },
    },
    {
        ignores: ['dist/**', 'node_modules/**', 'ui/**', 'ui-src/**', '*.js', 'eslint.config.mjs'],
    }
);
