// Teste de tela: monta o app de verdade num DOM (jsdom) e confere o caminho do
// registro inicial — identificar-se, entrar no quadro e aparecer assinado no
// histórico. O typecheck não pega nada disso.

import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from '../src/App';
import { AppProvider } from '../src/state/store';

let falhas = 0;
const diga = (nome: string, cond: boolean, obs = '') => {
  if (!cond) falhas++;
  console.log(cond ? 'ok   :' : 'FALHOU:', nome, obs);
};

const alvo = document.getElementById('raiz')!;
const raiz = createRoot(alvo);

async function principal() {
  await act(async () => {
    raiz.render(<AppProvider><App /></AppProvider>);
  });
  // Dá tempo ao carregar() assíncrono do repositório.
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

  const txt = () => alvo.textContent ?? '';

  diga('abre no registro inicial', txt().includes('Entrar no quadro'));
  diga('oferece as cinco funções',
    ['MR1', 'MR2', 'MR3', 'Interno', 'Staff'].every((x) =>
      [...alvo.querySelectorAll('label')].some((l) => l.textContent?.trim() === x)));
  diga('mostra como ficará a assinatura',
    /MR1 Fulano de Tal às \d\d:\d\d do dia \d\d\/\d\d\/\d{4}/.test(txt()), '');

  // Escolhe Staff e digita o nome.
  const staff = [...alvo.querySelectorAll('input[type=radio]')].find(
    (i) => (i as HTMLInputElement).value === 'staff'
  ) as HTMLInputElement;
  const nome = alvo.querySelector('#registro-nome') as HTMLInputElement;
  await act(async () => {
    staff.click();
  });
  diga('prévia acompanha a função escolhida', txt().includes('Staff Fulano de Tal'));

  await act(async () => {
    // React rastreia o valor do input por dentro: atribuir direto não dispara
    // onChange. O setter nativo é o caminho.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )!.set!;
    setter.call(nome, 'Leandro  Moreno ');
    nome.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await act(async () => {
    (alvo.querySelector('form') as HTMLFormElement).dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true })
    );
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

  diga('entra no quadro depois de se identificar', txt().includes('Quadro de Pacientes'));
  diga('barra superior mostra a assinatura', txt().includes('Staff Leandro Moreno'), '');

  // O histórico tem de trazer a linha por extenso.
  const itens = [...alvo.querySelectorAll('a, button')];
  const hist = itens.find((b) => b.textContent?.includes('Histórico'));
  if (hist) {
    await act(async () => { (hist as HTMLElement).click(); });
    diga('abriu o histórico', txt().includes('Histórico de alterações'));
    // Lê apenas as linhas do histórico, não a barra superior.
    const linhas = [...alvo.querySelectorAll('.card > div')].map((d) => d.textContent ?? '');
    const padrao = /Staff Leandro Moreno às \d\d:\d\d do dia \d\d\/\d\d\/\d{4}/;
    const assinadas = linhas.filter((l) => padrao.test(l));
    diga('histórico assina por extenso', assinadas.length > 0, assinadas[0] ?? linhas[0] ?? 'vazio');
  } else {
    diga('achei o item Histórico na navegação', false);
  }

  console.log(falhas === 0 ? '\nTELA OK' : `\n${falhas} FALHA(S) NA TELA`);
  process.exit(falhas === 0 ? 0 : 1);
}
void principal();
