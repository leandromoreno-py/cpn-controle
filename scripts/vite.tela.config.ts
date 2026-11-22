import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Empacota o teste de tela para rodar no node. Saída em .tela/, fora do git.
export default defineConfig({
  plugins: [react()],
  build: {
    ssr: 'scripts/tela.tsx',
    outDir: '.tela',
    emptyOutDir: true,
    minify: false,
  },
});
