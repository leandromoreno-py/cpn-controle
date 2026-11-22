// Modelo de dados do CPN Controle.
// Regra central: `categoria` é a identidade visual (cor da linha) e `status`
// é o momento do fluxo. Cesárea é DESFECHO, não status. Ver CLAUDE.md.

export type SessaoId = string;

/**
 * Uma sessão é uma unidade de internação com seu próprio conjunto de leitos e
 * pacientes — o Centro de Parto é a primeira, e o usuário pode criar outras
 * (alojamento conjunto, triagem, enfermaria) com o mesmo quadro.
 */
export interface Sessao {
  id: SessaoId;
  nome: string;
  ordem: number;
  criadaEm: string;
}

export type CategoriaId = string;

export interface Categoria {
  id: CategoriaId;
  /** Rótulo exibido no quadro — curto, cabe no chip da linha (ex.: "O.F."). */
  nome: string;
  /** Nome por extenso, usado em títulos e telas de configuração. */
  descricao?: string;
  cor: string; // hex escolhido pelo admin; o contraste é ajustado em runtime
  ordem: number;
  padrao: boolean;
}

export type StatusLeito = 'livre' | 'ocupado' | 'limpeza' | 'bloqueado';
export type TipoLeito = 'fixo' | 'extra' | 'personalizado';

export interface Leito {
  id: string;
  sessaoId: SessaoId;
  nome: string;
  tipo: TipoLeito;
  status: StatusLeito;
  observacao?: string;
  ativo: boolean;
}

export type StatusPaciente =
  | 'internada'
  | 'trabalho_de_parto'
  | 'centro_cirurgico'
  | 'puerpera'
  | 'alta'
  | 'transferida'
  | 'obito';

export type TipoDesfecho =
  | 'parto_normal'
  | 'cesarea'
  | 'aborto'
  | 'obito_materno'
  | 'obito_fetal'
  | 'alta_sem_desfecho'
  | 'transferida_sem_desfecho';

export interface Desfecho {
  tipo: TipoDesfecho;
  horario: string; // ISO
  indicacao?: string; // cesárea
  transferidaPara?: string;
  motivo?: string;
  causa?: string; // óbito materno ou fetal
  rn?: {
    sexo?: 'F' | 'M' | 'indeterminado';
    pesoGramas?: number;
    apgar1?: number;
    apgar5?: number;
    destino?: string;
  };
}

export type DinamicaUterina = 'ausente' | 'esparsa' | 'presente';
export type Bolsa = 'integra' | 'rota';
export type CorLiquido =
  | 'claro'
  | 'meconial_1'
  | 'meconial_2'
  | 'meconial_3'
  | 'sanguinolento';

export interface ToqueVaginal {
  dilatacaoCm?: number;
  apagamentoPct?: number;
  delee?: number; // -3 a +3
  bolsa?: Bolsa;
  horaRotura?: string; // HH:MM
  corLiquido?: CorLiquido;
}

export interface BalancoHidrico {
  ingestaOralMl?: number;
  infusaoEvMl?: number;
  hidratacaoVia?: string;
  diureseMl?: number;
  outrasPerdasMl?: number;
}

export interface Controle {
  id: string;
  pacienteId: string;
  horario: string; // ISO — editável pela pessoa que registra
  responsavelId?: string;
  responsavelNome: string; // nome exibido na auditoria
  responsavelFuncao?: FuncaoUsuario; // função no momento do registro
  lancadoPorId?: string; // conta que lançou, quando difere do responsável
  lancadoPorNome?: string;
  lancadoPorFuncao?: FuncaoUsuario;
  paSistolica?: number;
  paDiastolica?: number;
  fc?: number;
  fr?: number;
  temperatura?: number;
  spo2?: number;
  bcf?: number;
  dinamicaUterina?: DinamicaUterina;
  balanco?: BalancoHidrico; // ausente = bloco não incluído
  toque?: ToqueVaginal; // ausente = bloco não incluído
  observacao?: string;
}

export interface Medicacao {
  id: string;
  pacienteId: string;
  nome: string;
  dose?: string;
  via?: string;
  vazaoMlH?: number;
  inicio?: string; // ISO
  intervaloMin?: number;
  proximaDose?: string; // ISO — calculada
  ultimaDoseEm?: string; // ISO — mantido por compatibilidade
  /** Horários das doses efetivamente administradas, em ordem. */
  dosesAdministradas?: string[];
  /** Quantas doses o esquema prevê ao todo (ex.: betametasona, 2). */
  totalDoses?: number;
  observacao?: string;
  status: 'em_curso' | 'suspensa' | 'concluida';
}

export interface ExameProgramacao {
  id: string;
  pacienteId: string;
  texto: string;
  horarioProgramado?: string; // HH:MM
  realizado: boolean;
  realizadoEm?: string;
  realizadoPor?: string;
  /**
   * Horário da ÚLTIMA vez que foi feito, preservado mesmo quando o item volta a
   * pendente. É o que permite ver "últ. 14:32" numa cardiotocografia que se
   * repete ao longo do plantão.
   */
  ultimaRealizacaoEm?: string;
  ultimaRealizacaoPor?: string;
}

export interface Paciente {
  id: string;
  sessaoId: SessaoId;
  leitoId: string | null;
  nome: string;
  idade?: number;
  dataNascimento?: string;
  categoriaId: CategoriaId;
  status: StatusPaciente;
  desfecho?: Desfecho;
  paridadeG?: number;
  paridadeP?: number;
  paridadeA?: number;
  dum?: string; // ISO — preferencial para calcular a IG
  igAdmissaoSemanas?: number;
  igAdmissaoDias?: number;
  igDataReferencia?: string; // ISO
  comorbidades: string[];
  dinamicaUterina?: DinamicaUterina;
  intervaloControleMin: number;
  observacoes?: string;
  /** Descrição do caso em texto livre, aberta pelo chip do leito. */
  anamnese?: string;
  arquivada: boolean;
  arquivadaEm?: string;
  criadoEm: string;
  atualizadoEm: string;
  atualizadoPor?: string;
}

export type AcaoAuditoria =
  | 'admissao'
  | 'edicao_campo'
  | 'registro_controle'
  | 'medicacao'
  | 'exame_check'
  | 'transferencia_leito'
  | 'mudanca_status'
  | 'desfecho'
  | 'alta'
  | 'arquivamento'
  | 'reabertura'
  | 'alteracao_leito'
  | 'alteracao_categoria'
  | 'anamnese'
  | 'obito'
  | 'liberacao_leito'
  | 'alteracao_sessao'
  | 'registro_inicial';

export interface RegistroAuditoria {
  id: string;
  pacienteId?: string;
  usuarioId?: string;
  usuarioNome: string;
  /**
   * Função de quem registrou, no momento do registro. Fica gravada aqui, e não
   * lida do cadastro na hora de exibir, porque a pessoa muda de função com o
   * tempo (MR1 vira MR2) e a auditoria tem de continuar dizendo o que era
   * verdade naquele plantão. Ausente nos registros gravados antes das funções
   * fixas.
   */
  usuarioFuncao?: FuncaoUsuario;
  acao: AcaoAuditoria;
  entidade?: string;
  campo?: string;
  valorAnterior?: string;
  valorNovo?: string;
  timestamp: string;
}

/**
 * Cinco funções fixas, escolhidas no registro inicial. A lista é fechada de
 * propósito: é ela que aparece na assinatura de cada alteração, e sigla curta
 * com significado combinado vale mais que texto livre num plantão.
 */
export type FuncaoUsuario = 'mr1' | 'mr2' | 'mr3' | 'interno' | 'staff';

/** Ordem de exibição — da formação mais recente à mais antiga. */
export const FUNCOES: FuncaoUsuario[] = ['mr1', 'mr2', 'mr3', 'interno', 'staff'];

export interface Usuario {
  id: string;
  nome: string;
  funcao: FuncaoUsuario;
  registroProfissional?: string;
  email?: string;
  ativo: boolean;
}

export interface Config {
  comorbidades: string[];
  intervalosControleMin: number[];
  turnos: string[]; // HH:MM
}

export interface EstadoApp {
  sessoes: Sessao[];
  categorias: Categoria[];
  leitos: Leito[];
  pacientes: Paciente[];
  controles: Controle[];
  medicacoes: Medicacao[];
  exames: ExameProgramacao[];
  usuarios: Usuario[];
  auditoria: RegistroAuditoria[];
  config: Config;
}

/** Sigla curta — é o que entra na assinatura e nos chips. */
export const FUNCAO_LABEL: Record<FuncaoUsuario, string> = {
  mr1: 'MR1',
  mr2: 'MR2',
  mr3: 'MR3',
  interno: 'Interno',
  staff: 'Staff',
};

/** Por extenso — título, confirmação e tela de registro inicial. */
export const FUNCAO_DESCRICAO: Record<FuncaoUsuario, string> = {
  mr1: 'Médico(a) residente — 1º ano',
  mr2: 'Médico(a) residente — 2º ano',
  mr3: 'Médico(a) residente — 3º ano',
  interno: 'Interno(a) de medicina',
  staff: 'Staff — médico(a) do serviço',
};

/**
 * Funções antigas, de antes da lista fixa. Ficam aqui só para o estado salvo
 * no navegador e os cadastros já criados não perderem a referência. Não
 * aparecem para escolher.
 */
export const FUNCAO_LEGADA: Record<string, FuncaoUsuario> = {
  residente: 'mr1',
  medico: 'staff',
  admin: 'staff',
  enfermeiro_obstetra: 'staff',
  obstetriz: 'staff',
  tecnico: 'interno',
  doula: 'interno',
  outra: 'staff',
};

/** Normaliza qualquer valor vindo do disco ou do banco para a lista fixa. */
export function normalizarFuncao(bruto: unknown): FuncaoUsuario {
  const v = String(bruto ?? '');
  if ((FUNCOES as string[]).includes(v)) return v as FuncaoUsuario;
  return FUNCAO_LEGADA[v] ?? 'staff';
}

export const DESFECHO_LABEL: Record<TipoDesfecho, string> = {
  parto_normal: 'Parto normal',
  cesarea: 'Cesárea',
  aborto: 'Aborto',
  obito_materno: 'Óbito materno',
  obito_fetal: 'Óbito fetal',
  alta_sem_desfecho: 'Alta sem desfecho obstétrico',
  transferida_sem_desfecho: 'Transferida sem desfecho',
};

export const STATUS_LABEL: Record<StatusPaciente, string> = {
  internada: 'Internada',
  trabalho_de_parto: 'Em trabalho de parto',
  centro_cirurgico: 'Em centro cirúrgico',
  puerpera: 'Puérpera',
  alta: 'Alta',
  transferida: 'Transferida',
  obito: 'Óbito',
};

export const STATUS_LEITO_LABEL: Record<StatusLeito, string> = {
  livre: 'Livre',
  ocupado: 'Ocupado',
  limpeza: 'Em limpeza',
  bloqueado: 'Bloqueado',
};

export const DU_LABEL: Record<DinamicaUterina, string> = {
  ausente: 'DU ausente',
  esparsa: 'DU esparsa',
  presente: 'DU presente',
};

export const COR_LIQUIDO_LABEL: Record<CorLiquido, string> = {
  claro: 'Claro',
  meconial_1: 'Meconial +',
  meconial_2: 'Meconial ++',
  meconial_3: 'Meconial +++',
  sanguinolento: 'Sanguinolento',
};
