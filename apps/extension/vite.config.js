import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, 'public');
const distDir = path.resolve(__dirname, 'dist');

const copyPublicDir = () => {
  if (!fs.existsSync(publicDir)) return;
  fs.cpSync(publicDir, distDir, { recursive: true, force: true });
};

const addPublicWatchFiles = (ctx) => {
  if (!fs.existsSync(publicDir)) return;
  ctx.addWatchFile(publicDir);
  const stack = [publicDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(nextPath);
      } else {
        ctx.addWatchFile(nextPath);
      }
    }
  }
};

const watchPublicPlugin = () => ({
  name: 'watch-extension-public',
  apply: 'build',
  buildStart() {
    if (this.meta.watchMode) {
      addPublicWatchFiles(this);
    }
    copyPublicDir();
  },
  watchChange(id) {
    if (!this.meta.watchMode || !id) return;
    const normalizedId = path.resolve(id);
    if (normalizedId.startsWith(publicDir)) {
      copyPublicDir();
    }
  }
});

export default defineConfig(({ mode }) => {
  const isExtensionMode = mode === 'extension';

  return {
    plugins: [react(), watchPublicPlugin()],
    build: {
      outDir: 'dist',
      emptyOutDir: !isExtensionMode,
      copyPublicDir: false,
      sourcemap: isExtensionMode,
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
  };
});
