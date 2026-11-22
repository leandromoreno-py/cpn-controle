import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import type {
  Categoria,
  Controle,
  EstadoApp,
  ExameProgramacao,
  Leito,
  Medicacao,
  Paciente,
  RegistroAuditoria,
  Sessao,
  Usuario,
} from '../types';
import { normalizarFuncao } from '../types';
import type { FuncaoUsuario } from '../types';
import type { Repositorio } from './repositorio';
import { COMORBIDADES_PADRAO } from './seed';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function supabaseConfigurado(): boolean {
  return Boolean(url && chave);
}

let cliente: SupabaseClient | null = null;

export function obterCliente(): SupabaseClient {
  if (!cliente) {
    if (!url || !chave) throw new Error('Supabase não configurado: preencha o .env');
    cliente = createClient(url, chave, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cliente;
}

// ------------------------------------------------------------- conversões
// O banco usa snake_case e o app camelCase. As conversões são explícitas, uma
// por tabela: um mapeamento automático esconderia erro de nome de coluna até
// alguém perceber um campo vazio no plantão.

type Linha = Record<string, unknown>;

const paraData = (v: unknown): string | undefined =>
  v == null ? undefined : new Date(v as string).toISOString();

function sessaoDe(r: Linha): Sessao {
  return {
    id: r.id as string,
    nome: r.nome as string,
    ordem: (r.ordem as number) ?? 0,
    criadaEm: paraData(r.created_at) ?? new Date().toISOString(),
  };
}
const sessaoPara = (s: Sessao): Linha => ({ id: s.id, nome: s.nome, ordem: s.ordem });

function categoriaDe(r: Linha): Categoria {
  return {
    id: r.id as string,
    nome: r.nome as string,
    descricao: (r.descricao as string) ?? undefined,
    cor: r.cor as string,
    ordem: (r.ordem as number) ?? 0,
    padrao: Boolean(r.padrao),
  };
}
const categoriaPara = (c: Categoria): Linha => ({
  id: c.id,
  nome: c.nome,
  descricao: c.descricao ?? null,
  cor: c.cor,
  ordem: c.ordem,
  padrao: c.padrao,
});

function leitoDe(r: Linha): Leito {
  return {
    id: r.id as string,
    sessaoId: r.sessao_id as string,
    nome: r.nome as string,
    tipo: r.tipo as Leito['tipo'],
    status: r.status as Leito['status'],
    observacao: (r.observacao as string) ?? undefined,
    ativo: Boolean(r.ativo),
  };
}
const leitoPara = (l: Leito): Linha => ({
  id: l.id,
  sessao_id: l.sessaoId,
  nome: l.nome,
  tipo: l.tipo,
  status: l.status,
  observacao: l.observacao ?? null,
  ativo: l.ativo,
});

function pacienteDe(r: Linha): Paciente {
  return {
    id: r.id as string,
    sessaoId: r.sessao_id as string,
    leitoId: (r.leito_id as string) ?? null,
    nome: r.nome as string,
    idade: (r.idade as number) ?? undefined,
    dataNascimento: (r.data_nascimento as string) ?? undefined,
    categoriaId: r.categoria_id as string,
    status: r.status as Paciente['status'],
    desfecho: (r.desfecho as Paciente['desfecho']) ?? undefined,
    paridadeG: (r.paridade_g as number) ?? undefined,
    paridadeP: (r.paridade_p as number) ?? undefined,
    paridadeA: (r.paridade_a as number) ?? undefined,
    dum: (r.dum as string) ?? undefined,
    igAdmissaoSemanas: (r.ig_admissao_semanas as number) ?? undefined,
    igAdmissaoDias: (r.ig_admissao_dias as number) ?? undefined,
    igDataReferencia: (r.ig_data_referencia as string) ?? undefined,
    comorbidades: (r.comorbidades as string[]) ?? [],
    dinamicaUterina: (r.dinamica_uterina as Paciente['dinamicaUterina']) ?? undefined,
    intervaloControleMin: (r.intervalo_controle_min as number) ?? 240,
    observacoes: (r.observacoes as string) ?? undefined,
    anamnese: (r.anamnese as string) ?? undefined,
    arquivada: Boolean(r.arquivada),
    arquivadaEm: paraData(r.arquivada_em),
    criadoEm: paraData(r.created_at) ?? new Date().toISOString(),
    atualizadoEm: paraData(r.updated_at) ?? new Date().toISOString(),
  };
}
const pacientePara = (p: Paciente): Linha => ({
  id: p.id,
  sessao_id: p.sessaoId,
  leito_id: p.leitoId,
  nome: p.nome,
  idade: p.idade ?? null,
  data_nascimento: p.dataNascimento ?? null,
  categoria_id: p.categoriaId,
  status: p.status,
  desfecho: p.desfecho ?? null,
  paridade_g: p.paridadeG ?? null,
  paridade_p: p.paridadeP ?? null,
  paridade_a: p.paridadeA ?? null,
  dum: p.dum ? p.dum.slice(0, 10) : null,
  ig_admissao_semanas: p.igAdmissaoSemanas ?? null,
  ig_admissao_dias: p.igAdmissaoDias ?? null,
  ig_data_referencia: p.igDataReferencia ? p.igDataReferencia.slice(0, 10) : null,
  comorbidades: p.comorbidades,
  dinamica_uterina: p.dinamicaUterina ?? null,
  intervalo_controle_min: p.intervaloControleMin,
  observacoes: p.observacoes ?? null,
  anamnese: p.anamnese ?? null,
  arquivada: p.arquivada,
  arquivada_em: p.arquivadaEm ?? null,
});

function controleDe(r: Linha): Controle {
  return {
    id: r.id as string,
    pacienteId: r.paciente_id as string,
    horario: paraData(r.horario) ?? new Date().toISOString(),
    responsavelId: (r.responsavel_id as string) ?? undefined,
    responsavelNome: r.responsavel_nome as string,
    responsavelFuncao: r.responsavel_funcao ? normalizarFuncao(r.responsavel_funcao) : undefined,
    lancadoPorId: (r.lancado_por_id as string) ?? undefined,
    lancadoPorNome: (r.lancado_por_nome as string) ?? undefined,
    lancadoPorFuncao: r.lancado_por_funcao ? normalizarFuncao(r.lancado_por_funcao) : undefined,
    paSistolica: (r.pa_sistolica as number) ?? undefined,
    paDiastolica: (r.pa_diastolica as number) ?? undefined,
    fc: (r.fc as number) ?? undefined,
    fr: (r.fr as number) ?? undefined,
    temperatura: r.temperatura != null ? Number(r.temperatura) : undefined,
    spo2: (r.spo2 as number) ?? undefined,
    bcf: (r.bcf as number) ?? undefined,
    dinamicaUterina: (r.dinamica_uterina as Controle['dinamicaUterina']) ?? undefined,
    balanco: (r.balanco as Controle['balanco']) ?? undefined,
    toque: (r.toque as Controle['toque']) ?? undefined,
    observacao: (r.observacao as string) ?? undefined,
  };
}
const controlePara = (c: Controle): Linha => ({
  id: c.id,
  paciente_id: c.pacienteId,
  horario: c.horario,
  responsavel_id: c.responsavelId ?? null,
  responsavel_nome: c.responsavelNome,
  responsavel_funcao: c.responsavelFuncao ?? null,
  lancado_por_id: c.lancadoPorId ?? null,
  lancado_por_nome: c.lancadoPorNome ?? null,
  lancado_por_funcao: c.lancadoPorFuncao ?? null,
  pa_sistolica: c.paSistolica ?? null,
  pa_diastolica: c.paDiastolica ?? null,
  fc: c.fc ?? null,
  fr: c.fr ?? null,
  temperatura: c.temperatura ?? null,
  spo2: c.spo2 ?? null,
  bcf: c.bcf ?? null,
  dinamica_uterina: c.dinamicaUterina ?? null,
  balanco: c.balanco ?? null,
  toque: c.toque ?? null,
  observacao: c.observacao ?? null,
});

function medicacaoDe(r: Linha): Medicacao {
  return {
    id: r.id as string,
    pacienteId: r.paciente_id as string,
    nome: r.nome as string,
    dose: (r.dose as string) ?? undefined,
    via: (r.via as string) ?? undefined,
    vazaoMlH: r.vazao_ml_h != null ? Number(r.vazao_ml_h) : undefined,
    inicio: paraData(r.inicio),
    intervaloMin: (r.intervalo_min as number) ?? undefined,
    proximaDose: paraData(r.proxima_dose),
    ultimaDoseEm: paraData(r.ultima_dose_em),
    dosesAdministradas: ((r.doses_administradas as string[]) ?? []).map(
      (d) => new Date(d).toISOString()
    ),
    totalDoses: (r.total_doses as number) ?? undefined,
    observacao: (r.observacao as string) ?? undefined,
    status: r.status as Medicacao['status'],
  };
}
const medicacaoPara = (m: Medicacao): Linha => ({
  id: m.id,
  paciente_id: m.pacienteId,
  nome: m.nome,
  dose: m.dose ?? null,
  via: m.via ?? null,
  vazao_ml_h: m.vazaoMlH ?? null,
  inicio: m.inicio ?? null,
  intervalo_min: m.intervaloMin ?? null,
  proxima_dose: m.proximaDose ?? null,
  ultima_dose_em: m.ultimaDoseEm ?? null,
  doses_administradas: m.dosesAdministradas ?? [],
  total_doses: m.totalDoses ?? null,
  observacao: m.observacao ?? null,
  status: m.status,
});

function exameDe(r: Linha): ExameProgramacao {
  return {
    id: r.id as string,
    pacienteId: r.paciente_id as string,
    texto: r.texto as string,
    horarioProgramado: (r.horario_programado as string)?.slice(0, 5) ?? undefined,
    realizado: Boolean(r.realizado),
    realizadoEm: paraData(r.realizado_em),
    realizadoPor: (r.realizado_por_nome as string) ?? undefined,
    ultimaRealizacaoEm: paraData(r.ultima_realizacao_em),
    ultimaRealizacaoPor: (r.ultima_realizacao_por as string) ?? undefined,
  };
}
const examePara = (e: ExameProgramacao): Linha => ({
  id: e.id,
  paciente_id: e.pacienteId,
  texto: e.texto,
  horario_programado: e.horarioProgramado ?? null,
  realizado: e.realizado,
  realizado_em: e.realizadoEm ?? null,
  realizado_por_nome: e.realizadoPor ?? null,
  ultima_realizacao_em: e.ultimaRealizacaoEm ?? null,
  ultima_realizacao_por: e.ultimaRealizacaoPor ?? null,
});

function usuarioDe(r: Linha): Usuario {
  return {
    id: r.id as string,
    nome: r.nome as string,
    funcao: normalizarFuncao(r.funcao),
    registroProfissional: (r.registro_profissional as string) ?? undefined,
    email: (r.email as string) ?? undefined,
    ativo: Boolean(r.ativo),
  };
}
const usuarioPara = (u: Usuario): Linha => ({
  id: u.id,
  nome: u.nome,
  funcao: u.funcao,
  registro_profissional: u.registroProfissional ?? null,
  email: u.email ?? null,
  ativo: u.ativo,
});

function auditoriaDe(r: Linha): RegistroAuditoria {
  return {
    id: r.id as string,
    pacienteId: (r.paciente_id as string) ?? undefined,
    usuarioId: (r.usuario_id as string) ?? undefined,
    usuarioNome: r.usuario_nome as string,
    usuarioFuncao: r.usuario_funcao ? normalizarFuncao(r.usuario_funcao) : undefined,
    acao: r.acao as RegistroAuditoria['acao'],
    entidade: (r.entidade as string) ?? undefined,
    campo: (r.campo as string) ?? undefined,
    valorAnterior: (r.valor_anterior as string) ?? undefined,
    valorNovo: (r.valor_novo as string) ?? undefined,
    timestamp: paraData(r.timestamp) ?? new Date().toISOString(),
  };
}
const auditoriaPara = (a: RegistroAuditoria): Linha => ({
  id: a.id,
  paciente_id: a.pacienteId ?? null,
  usuario_id: a.usuarioId ?? null,
  usuario_nome: a.usuarioNome,
  usuario_funcao: a.usuarioFuncao ?? null,
  acao: a.acao,
  entidade: a.entidade ?? null,
  campo: a.campo ?? null,
  valor_anterior: a.valorAnterior ?? null,
  valor_novo: a.valorNovo ?? null,
  timestamp: a.timestamp,
});

// ------------------------------------------------------------- repositório

/**
 * Tabelas ouvidas em tempo real.
 *
 * **Toda tabela daqui precisa estar na publicação `supabase_realtime`**, no
 * `supabase/schema.sql`. Uma que esteja de fora não falha sozinha: o servidor
 * descarta TODAS as inscrições do canal que a menciona e mesmo assim responde
 * "SUBSCRIBED". `categorias` faltava, e o quadro passou a precisar de F5 sem
 * um único erro aparecer.
 */
const TABELAS_TEMPO_REAL = [
  'pacientes',
  'controles',
  'medicacoes',
  'exames_programacoes',
  'leitos',
  'sessoes',
  'categorias',
  'usuarios',
];

export function criarRepositorioSupabase(): Repositorio {
  const db = obterCliente();

  const upsert = async (tabela: string, linha: Linha) => {
    const { error } = await db.from(tabela).upsert(linha);
    if (error) throw new Error(`${tabela}: ${error.message}`);
  };
  const remover = async (tabela: string, id: string) => {
    const { error } = await db.from(tabela).delete().eq('id', id);
    if (error) throw new Error(`${tabela}: ${error.message}`);
  };

  return {
    backend: 'supabase',

    async carregar(): Promise<EstadoApp> {
      const [sessoes, categorias, leitos, pacientes, controles, medicacoes, exames, usuarios, auditoria, config] =
        await Promise.all([
          db.from('sessoes').select('*').order('ordem'),
          db.from('categorias').select('*').order('ordem'),
          db.from('leitos').select('*').order('nome'),
          db.from('pacientes').select('*'),
          db.from('controles').select('*').order('horario', { ascending: false }).limit(2000),
          db.from('medicacoes').select('*'),
          db.from('exames_programacoes').select('*'),
          db.from('usuarios').select('*').order('nome'),
          db.from('auditoria').select('*').order('timestamp', { ascending: false }).limit(500),
          db.from('config').select('*'),
        ]);

      const erro = [sessoes, categorias, leitos, pacientes, controles, medicacoes, exames, usuarios, auditoria, config]
        .map((r) => r.error)
        .find(Boolean);
      if (erro) throw new Error(erro.message);

      const valorConfig = <T>(chave: string, padrao: T): T => {
        const achado = (config.data ?? []).find((c: Linha) => c.chave === chave);
        return (achado?.valor as T) ?? padrao;
      };

      return {
        sessoes: (sessoes.data ?? []).map(sessaoDe),
        categorias: (categorias.data ?? []).map(categoriaDe),
        leitos: (leitos.data ?? []).map(leitoDe),
        pacientes: (pacientes.data ?? []).map(pacienteDe),
        controles: (controles.data ?? []).map(controleDe),
        medicacoes: (medicacoes.data ?? []).map(medicacaoDe),
        exames: (exames.data ?? []).map(exameDe),
        usuarios: (usuarios.data ?? []).map(usuarioDe),
        auditoria: (auditoria.data ?? []).map(auditoriaDe),
        config: {
          comorbidades: valorConfig('comorbidades', COMORBIDADES_PADRAO),
          intervalosControleMin: valorConfig('intervalos_controle_min', [60, 120, 240, 360]),
          turnos: valorConfig('turnos', ['07:00', '13:00', '19:00', '01:00']),
        },
      };
    },

    inscrever(aoMudar, aoFalhar) {
      // Qualquer mudança em qualquer tabela recarrega o estado. Com dezenas de
      // linhas isso é barato e evita reconciliar evento por evento — que é
      // onde moram os bugs difíceis de um quadro em tempo real.
      const canal = db.channel('cpn-controle');
      for (const tabela of TABELAS_TEMPO_REAL) {
        canal.on('postgres_changes', { event: '*', schema: 'public', table: tabela }, () =>
          aoMudar()
        );
      }
      canal.subscribe((status, erro) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          aoFalhar?.(erro?.message ?? status);
        }
      });

      // Rede de proteção. "SUBSCRIBED" não garante que os eventos venham — foi
      // assim que o tempo real ficou morto sem ninguém notar. Uma recarga ao
      // voltar para a aba e outra de minuto em minuto fazem o quadro se
      // corrigir sozinho mesmo quando o canal mente.
      const aoVoltar = () => {
        if (document.visibilityState === 'visible') aoMudar();
      };
      document.addEventListener('visibilitychange', aoVoltar);
      const relogio = setInterval(aoMudar, 60_000);

      return () => {
        document.removeEventListener('visibilitychange', aoVoltar);
        clearInterval(relogio);
        void db.removeChannel(canal);
      };
    },

    salvarSessao: (s) => upsert('sessoes', sessaoPara(s)),
    excluirSessao: (id) => remover('sessoes', id),
    salvarCategoria: (c) => upsert('categorias', categoriaPara(c)),
    salvarLeito: (l) => upsert('leitos', leitoPara(l)),
    excluirLeito: (id) => remover('leitos', id),
    salvarPaciente: (p) => upsert('pacientes', pacientePara(p)),
    excluirPaciente: (id) => remover('pacientes', id),
    salvarControle: (c) => upsert('controles', controlePara(c)),
    salvarMedicacao: (m) => upsert('medicacoes', medicacaoPara(m)),
    excluirMedicacao: (id) => remover('medicacoes', id),
    salvarExame: (e) => upsert('exames_programacoes', examePara(e)),
    excluirExame: (id) => remover('exames_programacoes', id),
    salvarUsuario: (u) => upsert('usuarios', usuarioPara(u)),
    registrarAuditoria: (r) => upsert('auditoria', auditoriaPara(r)),
  };
}

// ------------------------------------------------------------------- auth

export interface Autenticacao {
  sessao: Session | null;
  entrar(email: string, senha: string): Promise<void>;
  sair(): Promise<void>;
}

export async function entrarComSenha(email: string, senha: string): Promise<void> {
  const { error } = await obterCliente().auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(traduzirErroAuth(error.message));
}

export async function sair(): Promise<void> {
  await obterCliente().auth.signOut();
}

export async function sessaoAtual(): Promise<Session | null> {
  const { data } = await obterCliente().auth.getSession();
  return data.session;
}

export function aoMudarSessao(cb: (s: Session | null) => void): () => void {
  const { data } = obterCliente().auth.onAuthStateChange((_evento, sessao) => cb(sessao));
  return () => data.subscription.unsubscribe();
}

function traduzirErroAuth(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sem conexão com o servidor. Verifique a internet.';
  return mensagem;
}

/**
 * O registro de `usuarios` correspondente a quem está logado. É criado na
 * primeira entrada, para o nome do profissional aparecer na auditoria sem que
 * alguém precise cadastrá-lo duas vezes.
 */
/**
 * Entrada sem e-mail nem senha: o Supabase devolve uma sessão anônima de
 * verdade, com token e `auth.uid()` próprios, e o RLS continua valendo. A
 * identificação de quem é a pessoa vem depois, na tela de registro inicial.
 *
 * Exige "Allow anonymous sign-ins" ligado nas configurações de autenticação do
 * projeto. Desligado, o erro é claro e o app cai na entrada por conta.
 */
export async function entrarAnonimo(): Promise<Session | null> {
  const db = obterCliente();
  const { data, error } = await db.auth.signInAnonymously();
  if (error) throw new Error(traduzirErroAuth(error.message));
  // Devolve a sessão em vez de esperar o evento: o app não pode depender de
  // um aviso assíncrono para saber que já entrou.
  return data.session ?? null;
}

/**
 * Procura o cadastro desta sessão. Devolve null quando a pessoa ainda não se
 * identificou — é esse null que faz a tela de registro inicial aparecer.
 *
 * Não cria nada: antes o cadastro nascia sozinho com o nome tirado do e-mail,
 * o que produzia "leandro.cruz" assinando o prontuário.
 */
export async function garantirUsuario(sessao: Session): Promise<Usuario | null> {
  const db = obterCliente();
  const { data } = await db
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', sessao.user.id)
    .maybeSingle();
  return data ? usuarioDe(data as Linha) : null;
}

/**
 * Grava a identificação desta sessão: função e nome escolhidos na entrada.
 * `auth_user_id` amarra o cadastro à sessão, e é o que a política `self_insere`
 * exige — ninguém cria cadastro em nome de outra pessoa.
 */
export async function identificar(
  sessao: Session,
  funcao: FuncaoUsuario,
  nome: string
): Promise<Usuario | null> {
  const db = obterCliente();
  const existente = await garantirUsuario(sessao);
  if (existente) {
    // Mesma sessão de volta com outra função (MR1 virou MR2): o cadastro
    // acompanha, e o que ela já assinou continua com a função de então.
    if (existente.funcao === funcao && existente.nome === nome) return existente;
    const { data } = await db
      .from('usuarios')
      .update({ funcao, nome })
      .eq('id', existente.id)
      .select()
      .maybeSingle();
    return data ? usuarioDe(data as Linha) : existente;
  }
  const { data, error } = await db
    .from('usuarios')
    .insert({
      auth_user_id: sessao.user.id,
      nome,
      funcao,
      email: sessao.user.email ?? null,
      ativo: true,
    })
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? usuarioDe(data as Linha) : null;
}


// -------------------------------------------------------------- presença

/**
 * Quem está com o quadro aberto agora. Serve para a pessoa saber que não está
 * sozinha antes de mexer numa paciente — e para explicar uma linha que mudou
 * na frente dos olhos dela.
 */
export function acompanharPresenca(
  nome: string,
  aoMudar: (nomes: string[]) => void
): () => void {
  const db = obterCliente();
  const canal = db.channel('presenca-cpn', { config: { presence: { key: nome } } });

  const recolher = () => {
    const estado = canal.presenceState() as Record<string, unknown[]>;
    aoMudar(Object.keys(estado).sort((a, b) => a.localeCompare(b, 'pt-BR')));
  };

  canal
    .on('presence', { event: 'sync' }, recolher)
    .on('presence', { event: 'join' }, recolher)
    .on('presence', { event: 'leave' }, recolher)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') void canal.track({ nome, em: new Date().toISOString() });
    });

  return () => {
    void db.removeChannel(canal);
  };
}
