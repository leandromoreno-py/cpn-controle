import type { EstadoApp } from '../types';
import type { Repositorio } from './repositorio';
import { CATEGORIAS_PADRAO, SESSAO_PADRAO, estadoInicial } from './seed';

const CHAVE = 'cpn-controle:estado:v2';
const CHAVE_V1 = 'cpn-controle:estado:v1';

/**
 * Antes das sessões, leitos e pacientes não tinham `sessaoId`. Quem já abriu o
 * app em v1 mantém os dados: tudo passa a pertencer à sessão inicial.
 */
function migrarV1(bruto: string): EstadoApp | null {
  try {
    const antigo = JSON.parse(bruto) as EstadoApp;
    if (!antigo?.pacientes) return null;
    const sessaoId = SESSAO_PADRAO.id;
    return {
      ...antigo,
      sessoes: antigo.sessoes?.length ? antigo.sessoes : [SESSAO_PADRAO],
      leitos: (antigo.leitos ?? []).map((l) => ({ ...l, sessaoId: l.sessaoId ?? sessaoId })),
      pacientes: (antigo.pacientes ?? []).map((p) => ({
        ...p,
        sessaoId: p.sessaoId ?? sessaoId,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Categorias padrão acrescentadas depois chegam a quem já tem estado salvo. O
 * usuário continua podendo renomeá-las, recolori-las ou criar outras.
 */
function completarCategorias(estado: EstadoApp): EstadoApp {
  const faltando = CATEGORIAS_PADRAO.filter(
    (c) => !estado.categorias.some((x) => x.id === c.id)
  );
  if (faltando.length === 0) return estado;
  return {
    ...estado,
    categorias: [...estado.categorias, ...faltando].sort((a, b) => a.ordem - b.ordem),
  };
}

/**
 * Modo local: um quadro por navegador, sem multiusuário.
 *
 * Aqui não existe gravação por registro — o estado inteiro vai para o
 * localStorage a cada mudança, o que é inofensivo porque não há ninguém mais
 * escrevendo. As operações granulares da interface existem só para satisfazer
 * o contrato; quem persiste de fato é `salvarTudo`.
 */
export class RepositorioLocal implements Repositorio {
  readonly backend = 'local' as const;
  private estado: EstadoApp | null = null;

  async carregar(): Promise<EstadoApp> {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (bruto) {
        const estado = JSON.parse(bruto) as EstadoApp;
        if (!estado.sessoes?.length) estado.sessoes = [SESSAO_PADRAO];
        this.estado = completarCategorias(estado);
        return this.estado;
      }
      const antigo = localStorage.getItem(CHAVE_V1);
      if (antigo) {
        const migrado = migrarV1(antigo);
        if (migrado) {
          this.estado = completarCategorias(migrado);
          this.salvarTudo(this.estado);
          return this.estado;
        }
      }
    } catch {
      // Dado corrompido no navegador: recomeça do seed em vez de quebrar.
    }
    this.estado = estadoInicial();
    this.salvarTudo(this.estado);
    return this.estado;
  }

  salvarTudo(estado: EstadoApp): void {
    this.estado = estado;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
      // Cota cheia ou modo privado: o app segue em memória nesta sessão.
    }
  }

  inscrever(aoMudar: () => void): () => void {
    // Outra aba do MESMO navegador. Não é multiusuário — para isso, Supabase.
    const ouvir = (e: StorageEvent) => {
      if (e.key === CHAVE && e.newValue) aoMudar();
    };
    window.addEventListener('storage', ouvir);
    return () => window.removeEventListener('storage', ouvir);
  }

  // O estado inteiro já foi gravado por salvarTudo; nada a fazer por registro.
  private nada = async () => {};
  salvarSessao = this.nada;
  excluirSessao = this.nada;
  salvarCategoria = this.nada;
  salvarLeito = this.nada;
  excluirLeito = this.nada;
  salvarPaciente = this.nada;
  excluirPaciente = this.nada;
  salvarControle = this.nada;
  salvarMedicacao = this.nada;
  excluirMedicacao = this.nada;
  salvarExame = this.nada;
  excluirExame = this.nada;
  salvarUsuario = this.nada;
  registrarAuditoria = this.nada;
}
