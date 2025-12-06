import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, 'src/renderer'),
  publicDir: path.join(__dirname, 'public'),
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
      '@components': path.join(__dirname, 'src/renderer/components'),
      '@pages': path.join(__dirname, 'src/renderer/pages'),
      '@services': path.join(__dirname, 'src/services'),
      '@types': path.join(__dirname, 'src/types'),
      '@shared': path.join(__dirname, 'src/shared'), // Keep for now during migration
    },
  },
  server: {
    port: 3000,
  },
});
