import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome114',
    rollupOptions: {
      input: {
        content: path.resolve(__dirname, 'src/contentScript.jsx')
      },
      output: {
        entryFileNames: 'content-script.js',
        format: 'iife',
        inlineDynamicImports: true
      }
    }
  }
});
