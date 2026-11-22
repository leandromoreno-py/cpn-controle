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

export type Backend = 'local' | 'supabase';

/**
 * Acesso a dados por REGISTRO, não por estado inteiro.
 *
 * Com várias pessoas no mesmo quadro, salvar o estado completo faria a última
 * gravação apagar o trabalho das outras: quem clicasse por último venceria,
 * levando junto tudo que os colegas tivessem feito nos segundos anteriores.
 * Por isso cada alteração vira um upsert ou uma exclusão da linha afetada.
 */
export interface Repositorio {
  readonly backend: Backend;

  carregar(): Promise<EstadoApp>;

  /** Avisa que algo mudou do outro lado. Devolve o cancelador. */
  inscrever?(aoMudar: () => void): () => void;

  /** Só o modo local: grava o estado inteiro de uma vez. */
  salvarTudo?(estado: EstadoApp): void;

  salvarSessao(s: Sessao): Promise<void>;
  excluirSessao(id: string): Promise<void>;
  salvarCategoria(c: Categoria): Promise<void>;
  salvarLeito(l: Leito): Promise<void>;
  excluirLeito(id: string): Promise<void>;
  salvarPaciente(p: Paciente): Promise<void>;
  excluirPaciente(id: string): Promise<void>;
  salvarControle(c: Controle): Promise<void>;
  salvarMedicacao(m: Medicacao): Promise<void>;
  excluirMedicacao(id: string): Promise<void>;
  salvarExame(e: ExameProgramacao): Promise<void>;
  excluirExame(id: string): Promise<void>;
  salvarUsuario(u: Usuario): Promise<void>;
  registrarAuditoria(r: RegistroAuditoria): Promise<void>;
}

// ------------------------------------------------------------- diferenças

interface ComId {
  id: string;
}

function igual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface Diferenca<T> {
  alterados: T[];
  removidos: string[];
}

/** O que mudou entre duas listas, comparando por id. */
export function diferenca<T extends ComId>(antes: T[], depois: T[]): Diferenca<T> {
  const mapa = new Map(antes.map((x) => [x.id, x]));
  const alterados = depois.filter((d) => {
    const a = mapa.get(d.id);
    return a === undefined || !igual(a, d);
  });
  const presentes = new Set(depois.map((d) => d.id));
  const removidos = antes.filter((a) => !presentes.has(a.id)).map((a) => a.id);
  return { alterados, removidos };
}

/**
 * Compara dois estados e grava só o que mudou.
 *
 * Fica num lugar só, em vez de espalhado pelas ações do store: cada ação
 * continua escrevendo o próximo estado em memória, e a persistência granular
 * sai daqui. Uma ação nova passa a ser gravada sem ninguém lembrar de nada.
 */
export async function persistirDiferencas(
  repo: Repositorio,
  antes: EstadoApp,
  depois: EstadoApp
): Promise<void> {
  const tarefas: Promise<void>[] = [];

  const aplicar = <T extends ComId>(
    a: T[],
    d: T[],
    salvar: (x: T) => Promise<void>,
    excluir?: (id: string) => Promise<void>
  ) => {
    const { alterados, removidos } = diferenca(a, d);
    for (const x of alterados) tarefas.push(salvar(x));
    if (excluir) for (const id of removidos) tarefas.push(excluir(id));
  };

  // A ordem importa na primeira gravação: sessão antes de leito, leito antes
  // de paciente, paciente antes de controle — são as chaves estrangeiras.
  aplicar(antes.sessoes, depois.sessoes, (x) => repo.salvarSessao(x), (id) =>
    repo.excluirSessao(id)
  );
  aplicar(antes.categorias, depois.categorias, (x) => repo.salvarCategoria(x));
  aplicar(antes.usuarios, depois.usuarios, (x) => repo.salvarUsuario(x));
  aplicar(antes.leitos, depois.leitos, (x) => repo.salvarLeito(x), (id) =>
    repo.excluirLeito(id)
  );
  await Promise.all(tarefas.splice(0, tarefas.length));

  aplicar(antes.pacientes, depois.pacientes, (x) => repo.salvarPaciente(x), (id) =>
    repo.excluirPaciente(id)
  );
  await Promise.all(tarefas.splice(0, tarefas.length));

  aplicar(antes.controles, depois.controles, (x) => repo.salvarControle(x));
  aplicar(antes.medicacoes, depois.medicacoes, (x) => repo.salvarMedicacao(x), (id) =>
    repo.excluirMedicacao(id)
  );
  aplicar(antes.exames, depois.exames, (x) => repo.salvarExame(x), (id) =>
    repo.excluirExame(id)
  );
  // Auditoria só cresce: nunca é alterada nem removida.
  for (const r of diferenca(antes.auditoria, depois.auditoria).alterados) {
    tarefas.push(repo.registrarAuditoria(r));
  }
  await Promise.all(tarefas);
}

export const ESTADO_VAZIO: EstadoApp = {
  sessoes: [],
  categorias: [],
  leitos: [],
  pacientes: [],
  controles: [],
  medicacoes: [],
  exames: [],
  usuarios: [],
  auditoria: [],
  config: { comorbidades: [], intervalosControleMin: [], turnos: [] },
};

export type {
  Categoria,
  Controle,
  ExameProgramacao,
  Leito,
  Medicacao,
  Paciente,
  RegistroAuditoria,
  Sessao,
  Usuario,
};
