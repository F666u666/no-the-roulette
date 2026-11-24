import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'effects',
  base: '/effects/',
  publicDir: false,
  plugins: [react()],
  build: { outDir: '../dist/effects', emptyOutDir: true, target: 'safari15.4' },
});
