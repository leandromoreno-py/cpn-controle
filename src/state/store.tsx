import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AcaoAuditoria,
  Categoria,
  Controle,
  EstadoApp,
  ExameProgramacao,
  Leito,
  Paciente,
  Usuario,
} from '../types';
import { obterStorage, supabaseConfigurado, type Backend } from '../services/storage';
import { agoraIso, novoId } from '../lib/calc';

export type Tema = 'claro' | 'escuro';

interface Ctx {
  pronto: boolean;
  backend: Backend;
  multiusuario: boolean;
  estado: EstadoApp;
  tema: Tema;
  alternarTema(): void;
  usuarioAtual: Usuario;
  definirUsuarioAtual(id: string): void;

  admitir(dados: {
    paciente: Omit<Paciente, 'id' | 'criadoEm' | 'atualizadoEm' | 'arquivada'>;
    controleInicial?: Partial<Controle>;
    exames?: { texto: string; horarioProgramado?: string }[];
  }): void;
  atualizarPaciente(id: string, mudancas: Partial<Paciente>, campo?: string): void;
  registrarControle(controle: Omit<Controle, 'id'>): void;
  transferirLeito(pacienteId: string, novoLeitoId: string): void;
  arquivar(pacienteId: string, motivo: 'alta' | 'transferida', destino?: string): void;
  reabrir(pacienteId: string, leitoId: string): void;

  salvarLeito(leito: Leito): void;
  liberarLeito(leitoId: string): void;
  salvarCategoria(categoria: Categoria): void;
  restaurarCoresPadrao(): void;
  alternarExame(exame: ExameProgramacao): void;

  adicionarUsuario(u: Omit<Usuario, 'id'>): Usuario;
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp precisa estar dentro de <AppProvider>');
  return c;
}

const CHAVE_TEMA = 'cpn-controle:tema';
const CHAVE_USUARIO = 'cpn-controle:usuario';

export function AppProvider({ children }: { children: ReactNode }) {
  const storage = useMemo(() => obterStorage(), []);
  const [estado, setEstado] = useState<EstadoApp | null>(null);
  const [tema, setTema] = useState<Tema>(
    () => (localStorage.getItem(CHAVE_TEMA) as Tema) ?? 'claro'
  );
  const [usuarioId, setUsuarioId] = useState<string>(
    () => localStorage.getItem(CHAVE_USUARIO) ?? ''
  );
  // Evita gravar de volta o estado que acabou de chegar de outro cliente.
  const vindoDeFora = useRef(false);

  useEffect(() => {
    let vivo = true;
    storage.carregar().then((e) => {
      if (vivo) setEstado(e);
    });
    return () => {
      vivo = false;
    };
  }, [storage]);

  useEffect(() => {
    if (!storage.inscrever) return;
    return storage.inscrever((e) => {
      vindoDeFora.current = true;
      setEstado(e);
    });
  }, [storage]);

  useEffect(() => {
    if (!estado) return;
    if (vindoDeFora.current) {
      vindoDeFora.current = false;
      return;
    }
    void storage.salvar(estado);
  }, [estado, storage]);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    localStorage.setItem(CHAVE_TEMA, tema);
  }, [tema]);

  const usuarioAtual: Usuario = useMemo(() => {
    const achado = estado?.usuarios.find((u) => u.id === usuarioId);
    return (
      achado ??
      estado?.usuarios[0] ?? {
        id: 'u_desconhecido',
        nome: 'Usuário',
        funcao: 'outra',
        ativo: true,
      }
    );
  }, [estado, usuarioId]);

  const mutar = useCallback(
    (
      fn: (e: EstadoApp) => EstadoApp,
      registro?: Omit<Ctx['estado']['auditoria'][number], 'id' | 'timestamp' | 'usuarioNome'> & {
        usuarioNome?: string;
      }
    ) => {
      setEstado((anterior) => {
        if (!anterior) return anterior;
        const proximo = fn(anterior);
        if (!registro) return proximo;
        return {
          ...proximo,
          auditoria: [
            {
              ...registro,
              id: novoId('aud'),
              timestamp: agoraIso(),
              usuarioNome: registro.usuarioNome ?? usuarioAtual.nome,
              usuarioId: registro.usuarioId ?? usuarioAtual.id,
            },
            ...proximo.auditoria,
          ],
        };
      });
    },
    [usuarioAtual]
  );

  const auditar = (
    acao: AcaoAuditoria,
    extra: Partial<EstadoApp['auditoria'][number]> = {}
  ) => ({ acao, ...extra });

  const api: Ctx = {
    pronto: estado != null,
    backend: storage.backend,
    multiusuario: supabaseConfigurado(),
    estado: estado ?? {
      categorias: [],
      leitos: [],
      pacientes: [],
      controles: [],
      medicacoes: [],
      exames: [],
      usuarios: [],
      auditoria: [],
      config: { comorbidades: [], intervalosControleMin: [], turnos: [] },
    },
    tema,
    alternarTema: () => setTema((t) => (t === 'claro' ? 'escuro' : 'claro')),
    usuarioAtual,
    definirUsuarioAtual: (id) => {
      setUsuarioId(id);
      localStorage.setItem(CHAVE_USUARIO, id);
    },

    admitir: ({ paciente, controleInicial, exames }) => {
      const id = novoId('p');
      const agora = agoraIso();
      mutar(
        (e) => ({
          ...e,
          pacientes: [
            ...e.pacientes,
            { ...paciente, id, arquivada: false, criadoEm: agora, atualizadoEm: agora },
          ],
          leitos: e.leitos.map((l) =>
            l.id === paciente.leitoId ? { ...l, status: 'ocupado' } : l
          ),
          controles: controleInicial
            ? [
                ...e.controles,
                {
                  ...controleInicial,
                  id: novoId('c'),
                  pacienteId: id,
                  horario: controleInicial.horario ?? agora,
                  responsavelNome: controleInicial.responsavelNome ?? usuarioAtual.nome,
                  responsavelId: controleInicial.responsavelId ?? usuarioAtual.id,
                } as Controle,
              ]
            : e.controles,
          exames: [
            ...e.exames,
            ...(exames ?? []).map((x) => ({
              id: novoId('e'),
              pacienteId: id,
              texto: x.texto,
              horarioProgramado: x.horarioProgramado,
              realizado: false,
            })),
          ],
        }),
        auditar('admissao', { pacienteId: id, valorNovo: paciente.nome })
      );
    },

    atualizarPaciente: (id, mudancas, campo) => {
      mutar((e) => {
        const antes = e.pacientes.find((p) => p.id === id);
        return {
          ...e,
          pacientes: e.pacientes.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...mudancas,
                  atualizadoEm: agoraIso(),
                  atualizadoPor: usuarioAtual.nome,
                }
              : p
          ),
          auditoria: [
            {
              id: novoId('aud'),
              timestamp: agoraIso(),
              usuarioId: usuarioAtual.id,
              usuarioNome: usuarioAtual.nome,
              acao: 'edicao_campo' as AcaoAuditoria,
              pacienteId: id,
              campo,
              valorAnterior: campo
                ? String((antes as Record<string, unknown> | undefined)?.[campo] ?? '')
                : undefined,
              valorNovo: campo
                ? String((mudancas as Record<string, unknown>)[campo] ?? '')
                : undefined,
            },
            ...e.auditoria,
          ],
        };
      });
    },

    registrarControle: (controle) => {
      mutar(
        (e) => ({
          ...e,
          controles: [...e.controles, { ...controle, id: novoId('c') }],
          pacientes: e.pacientes.map((p) =>
            p.id === controle.pacienteId
              ? {
                  ...p,
                  dinamicaUterina: controle.dinamicaUterina ?? p.dinamicaUterina,
                  atualizadoEm: agoraIso(),
                  atualizadoPor: usuarioAtual.nome,
                }
              : p
          ),
        }),
        auditar('registro_controle', {
          pacienteId: controle.pacienteId,
          valorNovo: controle.responsavelNome,
          // Quando o responsável foi trocado no popup, a auditoria guarda as
          // duas informações: quem registrou e de qual conta foi lançado.
          campo:
            controle.responsavelId && controle.responsavelId !== usuarioAtual.id
              ? `lançado por ${usuarioAtual.nome}`
              : undefined,
        })
      );
    },

    transferirLeito: (pacienteId, novoLeitoId) => {
      mutar(
        (e) => {
          const paciente = e.pacientes.find((p) => p.id === pacienteId);
          const antigo = paciente?.leitoId;
          return {
            ...e,
            pacientes: e.pacientes.map((p) =>
              p.id === pacienteId
                ? { ...p, leitoId: novoLeitoId, atualizadoEm: agoraIso() }
                : p
            ),
            // Transferência libera o leito de origem marcando-o "em limpeza".
            leitos: e.leitos.map((l) => {
              if (l.id === antigo) return { ...l, status: 'limpeza' as const };
              if (l.id === novoLeitoId) return { ...l, status: 'ocupado' as const };
              return l;
            }),
          };
        },
        auditar('transferencia_leito', { pacienteId, valorNovo: novoLeitoId })
      );
    },

    arquivar: (pacienteId, motivo, destino) => {
      mutar(
        (e) => {
          const paciente = e.pacientes.find((p) => p.id === pacienteId);
          return {
            ...e,
            pacientes: e.pacientes.map((p) =>
              p.id === pacienteId
                ? {
                    ...p,
                    arquivada: true,
                    arquivadaEm: agoraIso(),
                    status: motivo,
                    leitoId: null,
                    desfecho:
                      motivo === 'transferida'
                        ? {
                            tipo: 'transferida_sem_desfecho' as const,
                            horario: agoraIso(),
                            transferidaPara: destino,
                          }
                        : p.desfecho,
                    atualizadoEm: agoraIso(),
                  }
                : p
            ),
            // Nada é excluído: o leito só volta a ficar disponível.
            leitos: e.leitos.map((l) =>
              l.id === paciente?.leitoId ? { ...l, status: 'limpeza' as const } : l
            ),
          };
        },
        auditar('arquivamento', { pacienteId, valorNovo: destino ?? motivo })
      );
    },

    reabrir: (pacienteId, leitoId) => {
      mutar(
        (e) => ({
          ...e,
          pacientes: e.pacientes.map((p) =>
            p.id === pacienteId
              ? {
                  ...p,
                  arquivada: false,
                  arquivadaEm: undefined,
                  leitoId,
                  status: 'internada' as const,
                  atualizadoEm: agoraIso(),
                }
              : p
          ),
          leitos: e.leitos.map((l) =>
            l.id === leitoId ? { ...l, status: 'ocupado' as const } : l
          ),
        }),
        auditar('reabertura', { pacienteId, valorNovo: leitoId })
      );
    },

    salvarLeito: (leito) => {
      mutar(
        (e) => ({
          ...e,
          leitos: e.leitos.some((l) => l.id === leito.id)
            ? e.leitos.map((l) => (l.id === leito.id ? leito : l))
            : [...e.leitos, leito],
        }),
        auditar('alteracao_leito', { entidade: 'leito', valorNovo: leito.nome })
      );
    },

    liberarLeito: (leitoId) => {
      mutar(
        (e) => ({
          ...e,
          leitos: e.leitos.map((l) =>
            l.id === leitoId ? { ...l, status: 'livre' as const } : l
          ),
        }),
        auditar('alteracao_leito', { entidade: 'leito', campo: 'status', valorNovo: 'livre' })
      );
    },

    salvarCategoria: (categoria) => {
      mutar(
        (e) => ({
          ...e,
          categorias: e.categorias.some((c) => c.id === categoria.id)
            ? e.categorias.map((c) => (c.id === categoria.id ? categoria : c))
            : [...e.categorias, categoria],
        }),
        auditar('alteracao_categoria', {
          entidade: 'categoria',
          valorNovo: `${categoria.nome} ${categoria.cor}`,
        })
      );
    },

    restaurarCoresPadrao: () => {
      const padrao: Record<string, string> = {
        cat_gestante: '#2563EB',
        cat_puerpera: '#C2185B',
        cat_aborto: '#1F2937',
        cat_nc: '#9CA3AF',
      };
      mutar(
        (e) => ({
          ...e,
          categorias: e.categorias.map((c) =>
            padrao[c.id] ? { ...c, cor: padrao[c.id] } : c
          ),
        }),
        auditar('alteracao_categoria', { valorNovo: 'cores padrão restauradas' })
      );
    },

    alternarExame: (exame) => {
      mutar(
        (e) => ({
          ...e,
          exames: e.exames.map((x) =>
            x.id === exame.id
              ? {
                  ...x,
                  realizado: !x.realizado,
                  realizadoEm: !x.realizado ? agoraIso() : undefined,
                  realizadoPor: !x.realizado ? usuarioAtual.nome : undefined,
                }
              : x
          ),
        }),
        auditar('exame_check', {
          pacienteId: exame.pacienteId,
          campo: exame.texto,
          valorNovo: exame.realizado ? 'pendente' : 'realizado',
        })
      );
    },

    adicionarUsuario: (u) => {
      const novo: Usuario = { ...u, id: novoId('u') };
      mutar((e) => ({ ...e, usuarios: [...e.usuarios, novo] }));
      return novo;
    },
  };

  return <AppCtx.Provider value={api}>{children}</AppCtx.Provider>;
}
