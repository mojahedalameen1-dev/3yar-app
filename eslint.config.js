import js from '@eslint/js'
import eslintPluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
    {
        ignores: ['dist/**', 'node_modules/**', '.git/**', '.output/**', 'coverage/**']
    },
    js.configs.recommended,
    ...eslintPluginVue.configs['flat/essential'],
    eslintConfigPrettier,
    {
        files: ['**/*.vue', '**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                process: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                module: 'readonly',
                require: 'readonly',
                __dirname: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                FileReader: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                navigator: 'readonly',
                location: 'readonly',
                FormData: 'readonly'
            }
        },
        rules: {
            'vue/multi-word-component-names': 'off',
            'vue/valid-v-slot': ['error', { allowModifiers: true }],
            'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
            'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
        }
    }
]
