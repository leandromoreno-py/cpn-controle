// Modelo de dados do CPN Controle.
// Regra central: `categoria` é a identidade visual (cor da linha) e `status`
// é o momento do fluxo. Cesárea é DESFECHO, não status. Ver CLAUDE.md.

export type CategoriaId = string;

export interface Categoria {
  id: CategoriaId;
  nome: string;
  cor: string; // hex escolhido pelo admin; o contraste é ajustado em runtime
  ordem: number;
  padrao: boolean;
}

export type StatusLeito = 'livre' | 'ocupado' | 'limpeza' | 'bloqueado';
export type TipoLeito = 'fixo' | 'extra' | 'personalizado';

export interface Leito {
  id: string;
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
  | 'transferida';

export type TipoDesfecho =
  | 'parto_normal'
  | 'cesarea'
  | 'aborto'
  | 'transferida_sem_desfecho';

export interface Desfecho {
  tipo: TipoDesfecho;
  horario: string; // ISO
  indicacao?: string; // cesárea
  transferidaPara?: string;
  motivo?: string;
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
  lancadoPorId?: string; // conta que lançou, quando difere do responsável
  lancadoPorNome?: string;
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
}

export interface Paciente {
  id: string;
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
  | 'alteracao_categoria';

export interface RegistroAuditoria {
  id: string;
  pacienteId?: string;
  usuarioId?: string;
  usuarioNome: string;
  acao: AcaoAuditoria;
  entidade?: string;
  campo?: string;
  valorAnterior?: string;
  valorNovo?: string;
  timestamp: string;
}

export type FuncaoUsuario =
  | 'enfermeiro_obstetra'
  | 'medico'
  | 'residente'
  | 'tecnico'
  | 'obstetriz'
  | 'doula'
  | 'admin'
  | 'outra';

export interface Usuario {
  id: string;
  nome: string;
  funcao: FuncaoUsuario;
  funcaoLivre?: string;
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

export const FUNCAO_LABEL: Record<FuncaoUsuario, string> = {
  enfermeiro_obstetra: 'Enf.ª obstetra',
  medico: 'Médico(a)',
  residente: 'Residente',
  tecnico: 'Técnico(a) de enfermagem',
  obstetriz: 'Obstetriz',
  doula: 'Doula',
  admin: 'Administrador(a)',
  outra: 'Outra',
};

export const STATUS_LABEL: Record<StatusPaciente, string> = {
  internada: 'Internada',
  trabalho_de_parto: 'Em trabalho de parto',
  centro_cirurgico: 'Em centro cirúrgico',
  puerpera: 'Puérpera',
  alta: 'Alta',
  transferida: 'Transferida',
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
