import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// O site publicado vive em https://<usuario>.github.io/cpn-controle/, então o
// build precisa desse prefixo nos caminhos dos assets. O servidor de
// desenvolvimento não: fica na raiz de localhost:5173.
//
// VITE_BASE sobrescreve o padrão — use "./" para um build de caminhos
// relativos (abrir o index.html direto do disco), ou "/" se um dia o projeto
// virar o repositório <usuario>.github.io.
const BASE_PUBLICACAO = '/cpn-controle/';

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === 'build' ? (process.env.VITE_BASE ?? BASE_PUBLICACAO) : '/',
}));
