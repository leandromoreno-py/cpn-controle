import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Caminhos RELATIVOS no build, de propósito.
//
// Antes era fixo em "/cpn-controle/", o endereço do GitHub Pages. Isso amarra
// o pacote a um host só: publicado na raiz de outro serviço (Vercel, Netlify,
// armazenamento do Supabase), todo asset cai em 404 e a tela fica branca, sem
// erro que explique.
//
// Com "./", o navegador resolve a partir de onde a página está. O MESMO pacote
// funciona em /cpn-controle/ do GitHub Pages, na raiz de qualquer outro
// serviço e até aberto direto do disco. Um proxy barrando um endereço deixa de
// ser um problema de build.
//
// Vale porque o app é uma página só, com navegação por estado — não há rota
// de URL para a raiz relativa atrapalhar. VITE_BASE ainda sobrescreve.
const BASE_PUBLICACAO = './';

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === 'build' ? (process.env.VITE_BASE ?? BASE_PUBLICACAO) : '/',
}));
