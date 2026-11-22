// Confere que o pacote gerado fala com o banco configurado.
//
// Existe por causa de uma falha silenciosa real: o workflow passava
// `VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}`, e um secret que não
// existe vira string VAZIA. Variável de ambiente vazia tem precedência sobre o
// .env.production, então o build saiu sem banco, o app publicado caiu em modo
// local — cada navegador com seu próprio quadro — e nada acusou o problema.
// Dois usuários testaram juntos e não se viram.
//
// Falhar a publicação é melhor que publicar um app que parece funcionar.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const env = readFileSync('.env.production', 'utf8');
const url = env.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim();

if (!url) {
  console.error('FALHOU: .env.production não define VITE_SUPABASE_URL.');
  process.exit(1);
}

const host = new URL(url).host;
const pasta = join('dist', 'assets');
const js = readdirSync(pasta)
  .filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(join(pasta, f), 'utf8'))
  .join('');

if (!js.includes(host)) {
  console.error(
    `FALHOU: o pacote não contém "${host}".\n` +
      'O app publicado assim roda em modo local: cada navegador com seu\n' +
      'próprio quadro, sem nada compartilhado e sem erro na tela.\n' +
      'Causa provável: uma variável VITE_SUPABASE_* vazia no ambiente do\n' +
      'build, que tem precedência sobre o .env.production.'
  );
  process.exit(1);
}

console.log(`ok: o pacote aponta para ${host}`);
