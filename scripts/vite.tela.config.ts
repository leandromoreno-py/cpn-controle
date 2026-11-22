import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Empacota o teste de tela para rodar no node. Saída em .tela/, fora do git.
//
// Os scripts rodam com `--mode testes` de propósito: assim o Vite procura
// `.env.testes`, que não existe, em vez de `.env.production`. Sem isso o teste
// herdava as credenciais do projeto publicado, entrava em modo banco e tentava
// autenticar a partir do node — falhando por motivo nenhum a ver com o que ele
// deveria estar verificando.
export default defineConfig({
  plugins: [react()],
  build: {
    ssr: 'scripts/tela.tsx',
    outDir: '.tela',
    emptyOutDir: true,
    minify: false,
  },
});
