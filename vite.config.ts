import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base: ajuste para "/<nome-do-repositorio>/" se publicar em GitHub Pages
// num repositório que não seja <usuario>.github.io
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE ?? '/',
});
