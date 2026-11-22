import {
  idadeGestacional, paridade, situacaoControle, debitoUrinario,
  diureseAnterior, calcularBalanco, alertasClinicos, duracao, isoComHora,
  serieDoses, recortarSerie, horaHM,
} from '../src/lib/calc';
import type { Medicacao } from '../src/types';
import { estiloCategoria, contrastRatio, hexToRgb, mistura } from '../src/lib/contrast';
import { estadoInicial } from '../src/services/seed';
import { diferenca, persistirDiferencas } from '../src/services/repositorio';

let falhas = 0;
const ok = (nome: string, cond: boolean, obs = '') => {
  if (!cond) { falhas++; console.log('FALHOU:', nome, obs); }
  else console.log('ok   :', nome, obs);
};

const e = estadoInicial();

// --- seed coerente
ok('8 pacientes', e.pacientes.length === 8, `${e.pacientes.length}`);
ok('15 leitos', e.leitos.length === 15, `${e.leitos.length}`);
ok('todas as pacientes têm categoria válida',
  e.pacientes.every((p) => e.categorias.some((c) => c.id === p.categoriaId)));
ok('todas as pacientes têm leito válido',
  e.pacientes.every((p) => e.leitos.some((l) => l.id === p.leitoId)));
ok('nenhum leito com duas pacientes',
  new Set(e.pacientes.map((p) => p.leitoId)).size === e.pacientes.length);
ok('leitos ocupados == pacientes ativas',
  e.leitos.filter((l) => l.status === 'ocupado').length === e.pacientes.filter((p) => !p.arquivada).length,
  `${e.leitos.filter((l) => l.status === 'ocupado').length}`);
ok('todo controle aponta para uma paciente',
  e.controles.every((c) => e.pacientes.some((p) => p.id === c.pacienteId)));

// --- idade gestacional
const p1 = e.pacientes[0];
ok('IG de p1 no formato XsXd', /^\d+s\d+d$/.test(idadeGestacional(p1)), idadeGestacional(p1));
ok('IG de p1 ~39s', idadeGestacional(p1).startsWith('39s'), idadeGestacional(p1));
const p7 = e.pacientes[6];
ok('IG por IG informada', idadeGestacional(p7) === '36s0d', idadeGestacional(p7));
ok('IG sem dados', idadeGestacional({ ...p1, dum: undefined, igAdmissaoSemanas: undefined }) === '—');

// --- paridade
ok('paridade G2P1A0', paridade(p1) === 'G2P1A0', paridade(p1));
ok('paridade desconhecida',
  paridade({ ...p1, paridadeG: undefined, paridadeP: undefined, paridadeA: undefined }) === 'G?P?A?');

// --- duração
ok('duração 135 min = 2h15', duracao(135) === '2h15', duracao(135));
ok('duração 45 min', duracao(45) === '45 min', duracao(45));
ok('duração 120 min = 2h00', duracao(120) === '2h00', duracao(120));

// --- situação do controle
const s1 = situacaoControle(p1, e.controles);
ok('p1 tem último controle', s1.ultimo?.id === 'c2', s1.ultimo?.id ?? 'nenhum');
const semControle = situacaoControle({ ...p1, id: 'zzz' }, e.controles);
ok('sem registro = atrasado', semControle.estado === 'atrasado' && semControle.label === 'sem registro');
// p1: último controle 11:02, meta 60 min -> vence 12:02
const p1as1230 = situacaoControle(p1, e.controles, new Date(isoComHora('12:30')).getTime());
ok('p1 às 12:30 com meta 1h = atrasado', p1as1230.estado === 'atrasado', p1as1230.label);
ok('rótulo mostra o quanto passou', p1as1230.label === 'atrasado 28 min', p1as1230.label);
const p1as1150 = situacaoControle(p1, e.controles, new Date(isoComHora('11:50')).getTime());
ok('p1 às 11:50 = vencendo (faltam 12 min)', p1as1150.estado === 'vencendo', p1as1150.label);
const p1as1120 = situacaoControle(p1, e.controles, new Date(isoComHora('11:20')).getTime());
ok('p1 às 11:20 = em dia (faltam 42 min)', p1as1120.estado === 'em_dia', p1as1120.label);
const p3 = e.pacientes[2]; // último 10:37, meta 120min -> vence 12:37
const s3 = situacaoControle(p3, e.controles, new Date(isoComHora('12:20')).getTime());
ok('p3 às 12:20 = vencendo (faltam 17 min)', s3.estado === 'vencendo', s3.label);
const s3b = situacaoControle(p3, e.controles, new Date(isoComHora('11:00')).getTime());
ok('p3 às 11:00 = em dia', s3b.estado === 'em_dia', s3b.label);

// --- débito urinário: (320-180)/2,8h ~= 50? confere a conta real
const anterior = diureseAnterior('p1', e.controles, isoComHora('11:02'));
ok('diurese anterior de p1 = 180 mL às 09:00', anterior?.volume === 180, JSON.stringify(anterior?.volume));
const d = debitoUrinario(320, isoComHora('11:02'), anterior);
const esperado = Math.round((320 - 180) / ((new Date(isoComHora('11:02')).getTime() - new Date(isoComHora('09:00')).getTime()) / 3600000));
ok('débito calculado corretamente', d?.mlPorHora === esperado, `${d?.mlPorHora} vs ${esperado}`);
ok('débito não alerta em 68 mL/h', d?.alerta === false, `${d?.mlPorHora}`);
const dBaixo = debitoUrinario(200, isoComHora('11:00'), { volume: 180, horario: isoComHora('09:00') });
ok('débito 10 mL/h alerta', dBaixo?.alerta === true, `${dBaixo?.mlPorHora}`);
ok('sem anterior = sem débito', debitoUrinario(320, isoComHora('11:00'), undefined) === null);
ok('horas zero = sem débito',
  debitoUrinario(320, isoComHora('09:00'), { volume: 180, horario: isoComHora('09:00') }) === null);

// --- balanço
const b = calcularBalanco({ ingestaOralMl: 300, infusaoEvMl: 500, diureseMl: 320, outrasPerdasMl: 0 });
ok('balanço +480', b.total === 480, `${b.total}`);
ok('memória do balanço cita as parcelas', b.memoria.includes('300 VO + 500 EV') && b.memoria.includes('320 diurese'));
const bNeg = calcularBalanco({ diureseMl: 500 });
ok('balanço negativo', bNeg.total === -500, `${bNeg.total}`);
ok('balanço vazio = 0', calcularBalanco({}).total === 0);

// --- alertas clínicos
ok('PA 148/92 alerta', alertasClinicos({ paSistolica: 148, paDiastolica: 92 }).length === 1);
ok('PA 138/86 não alerta', alertasClinicos({ paSistolica: 138, paDiastolica: 86 }).length === 0);
ok('PA 130/92 alerta (só diastólica)', alertasClinicos({ paSistolica: 130, paDiastolica: 92 }).length === 1);
ok('BCF 105 alerta', alertasClinicos({ bcf: 105 }).length === 1);
ok('BCF 165 alerta', alertasClinicos({ bcf: 165 }).length === 1);
ok('BCF 140 não alerta', alertasClinicos({ bcf: 140 }).length === 0);
ok('Temp 37,8 alerta', alertasClinicos({ temperatura: 37.8 }).length === 1);
ok('Temp 37,7 não alerta', alertasClinicos({ temperatura: 37.7 }).length === 0);
ok('SpO2 94 alerta', alertasClinicos({ spo2: 94 }).length === 1);
ok('FC 111 alerta', alertasClinicos({ fc: 111 }).length === 1);
ok('FR 25 alerta', alertasClinicos({ fr: 25 }).length === 1);
ok('dilatação 10 alerta', alertasClinicos({ toque: { dilatacaoCm: 10 } }).length === 1);
ok('vazio não alerta', alertasClinicos({}).length === 0);
ok('vários alertas somam', alertasClinicos({ paSistolica: 150, paDiastolica: 95, spo2: 90, fc: 120 }).length === 3);

// --- série de doses
const medBase: Medicacao = {
  id: 'mx', pacienteId: 'p1', nome: 'Ampicilina', intervaloMin: 360,
  inicio: isoComHora('04:00'), status: 'em_curso',
};
ok('sem intervalo não gera série', serieDoses({ ...medBase, intervaloMin: undefined }).length === 0);
ok('sem início não gera série', serieDoses({ ...medBase, inicio: undefined }).length === 0);

const semDoses = serieDoses(medBase, new Date(isoComHora('05:00')).getTime());
ok('1ª dose cai no horário de início', horaHM(semDoses[0].horario) === '04:00', horaHM(semDoses[0].horario));
ok('sem doses dadas, a 1ª é a próxima', semDoses[0].proxima && !semDoses[0].feita);
ok('1ª às 04:00 vista às 05:00 está atrasada', semDoses[0].atrasada === true);
ok('2ª projetada para 10:00', horaHM(semDoses[1].horario) === '10:00', horaHM(semDoses[1].horario));

const umaDada = serieDoses(
  { ...medBase, dosesAdministradas: [isoComHora('04:10')] },
  new Date(isoComHora('06:00')).getTime()
);
ok('dose dada guarda o horário REAL', horaHM(umaDada[0].horario) === '04:10', horaHM(umaDada[0].horario));
ok('dose dada vem marcada como feita', umaDada[0].feita === true);
// a projeção parte da ÚLTIMA dose dada, não do início: esquema atrasado anda junto
ok('2ª parte da última dose dada', horaHM(umaDada[1].horario) === '10:10', horaHM(umaDada[1].horario));
ok('2ª é a próxima', umaDada[1].proxima === true);
ok('2ª às 10:10 vista às 06:00 não está atrasada', umaDada[1].atrasada === false);

const comTotal = serieDoses(
  { ...medBase, totalDoses: 2, dosesAdministradas: [isoComHora('08:00')] },
  new Date(isoComHora('09:00')).getTime()
);
ok('total de doses limita a série', comTotal.length === 2, `${comTotal.length}`);

const completo = serieDoses(
  { ...medBase, totalDoses: 2, dosesAdministradas: [isoComHora('08:00'), isoComHora('14:00')] },
  new Date(isoComHora('15:00')).getTime()
);
ok('esquema completo não tem próxima', completo.every((d) => !d.proxima));
ok('esquema completo tem todas feitas', completo.every((d) => d.feita));

// --- recorte da série para caber na linha
const longa = serieDoses(
  { ...medBase, dosesAdministradas: ['1','2','3','4','5'].map((_, i) => isoComHora(`0${i + 1}:00`)) },
  new Date(isoComHora('23:00')).getTime()
);
const recorte = recortarSerie(longa, 4);
ok('recorte devolve no máximo 4', recorte.visiveis.length === 4, `${recorte.visiveis.length}`);
ok('recorte informa quantas ficaram de fora', recorte.cortado === longa.length - 4, `${recorte.cortado}`);
ok('recorte mantém a próxima visível', recorte.visiveis.some((d) => d.proxima));
ok('série curta não é recortada', recortarSerie(semDoses, 4).cortado === 0);

// --- contraste: toda categoria passa AA nos dois temas, inclusive cores ruins
const temas: [string, string, boolean][] = [['claro', '#FFFFFF', false], ['escuro', '#1E1228', true]];
const coresTeste = [...e.categorias.map((c) => c.cor), '#FFFF00', '#000000', '#FFFFFF', '#9CA3AF', '#FF00FF'];
for (const [nome, sup, dark] of temas) {
  for (const cor of coresTeste) {
    const est = estiloCategoria(cor, sup, 9, dark);
    ok(`contraste texto ${cor} tema ${nome} >= 4.5`, est.contrasteTexto >= 4.5, est.contrasteTexto.toFixed(2));
    const barra = contrastRatio(hexToRgb(est.barra), hexToRgb(sup));
    ok(`contraste barra ${cor} tema ${nome} >= 3`, barra >= 3, barra.toFixed(2));
  }
}
// fundo tingido da linha não deve derrubar o texto principal
for (const [nome, sup, dark] of temas) {
  const textoPrincipal = dark ? '#F1EAF5' : '#1B1020';
  for (const c of e.categorias) {
    const fundo = mistura(c.cor, sup, 9);
    const r = contrastRatio(hexToRgb(textoPrincipal), fundo);
    ok(`texto principal sobre linha ${c.nome} tema ${nome} >= 4.5`, r >= 4.5, r.toFixed(2));
  }
}

// --- gravação por registro (o que impede um usuário de apagar o do outro)
const estadoA = estadoInicial();
const estadoB = {
  ...estadoA,
  pacientes: estadoA.pacientes.map((p, i) => (i === 0 ? { ...p, nome: 'Outro Nome' } : p)),
};
const semUmPaciente = { ...estadoA, pacientes: estadoA.pacientes.slice(1) };

ok('diff acha 1 alterado', diferenca(estadoA.pacientes, estadoB.pacientes).alterados.length === 1);
ok('diff não inventa remoção', diferenca(estadoA.pacientes, estadoB.pacientes).removidos.length === 0);
ok('diff acha a remoção', diferenca(estadoA.pacientes, semUmPaciente.pacientes).removidos.length === 1);
ok('listas iguais não geram diff', diferenca(estadoA.pacientes, estadoA.pacientes).alterados.length === 0);

const chamadas: string[] = [];
const repoFalso = {
  backend: 'supabase' as const,
  carregar: async () => estadoA,
  salvarSessao: async () => { chamadas.push('sessao'); },
  excluirSessao: async () => { chamadas.push('-sessao'); },
  salvarCategoria: async () => { chamadas.push('categoria'); },
  salvarLeito: async () => { chamadas.push('leito'); },
  excluirLeito: async () => { chamadas.push('-leito'); },
  salvarPaciente: async () => { chamadas.push('paciente'); },
  excluirPaciente: async () => { chamadas.push('-paciente'); },
  salvarControle: async () => { chamadas.push('controle'); },
  salvarMedicacao: async () => { chamadas.push('medicacao'); },
  excluirMedicacao: async () => { chamadas.push('-medicacao'); },
  salvarExame: async () => { chamadas.push('exame'); },
  excluirExame: async () => { chamadas.push('-exame'); },
  salvarUsuario: async () => { chamadas.push('usuario'); },
  registrarAuditoria: async () => { chamadas.push('auditoria'); },
};

async function testarPersistencia() {
  await persistirDiferencas(repoFalso, estadoA, estadoB);
  ok('grava só o registro alterado', chamadas.join(',') === 'paciente', chamadas.join(','));

  chamadas.length = 0;
  await persistirDiferencas(repoFalso, estadoA, estadoA);
  ok('sem mudança, não grava nada', chamadas.length === 0, `${chamadas.length}`);

  chamadas.length = 0;
  await persistirDiferencas(repoFalso, estadoA, semUmPaciente);
  ok('remoção vira exclusão', chamadas.includes('-paciente'), chamadas.join(','));

  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} FALHA(S)`);
  process.exit(falhas === 0 ? 0 : 1);
}
void testarPersistencia();
