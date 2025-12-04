// Loader for running TypeScript in Electron during development
require('tsconfig-paths/register');
require('ts-node').register({
  transpileOnly: true,
  project: './tsconfig.main.json',
  compilerOptions: {
    module: 'commonjs',
    target: 'ES2022',
  },
});

require('./src/main/index.ts');
