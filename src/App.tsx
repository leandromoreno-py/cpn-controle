import { useEffect, useMemo, useState } from 'react';
import type { Paciente } from './types';
import { useApp } from './state/store';
import { Sidebar, iniciais, type Pagina } from './components/Sidebar';
import { AbasSessoes } from './components/AbasSessoes';
import { QuadroPacientes } from './components/QuadroPacientes';
import { ModalAdmissao } from './components/ModalAdmissao';
import { ModalControles } from './components/ModalControles';
import { ModalAnamnese } from './components/ModalAnamnese';
import { ModalEditarPaciente } from './components/ModalEditarPaciente';
import { ModalEncerrar } from './components/ModalEncerrar';
import { ConfigLeitos } from './components/ConfigLeitos';
import { ConfigCategorias } from './components/ConfigCategorias';
import { horaHM, situacaoControle } from './lib/calc';
import { DESFECHO_LABEL, FUNCAO_LABEL, STATUS_LABEL } from './types';

type Ordem = 'leito' | 'atraso' | 'categoria';

const CHAVE_VISTA = 'cpn-controle:vista';
/** Abaixo disto, o quadro de dois níveis só caberia com rolagem horizontal. */
const LARGURA_MINIMA_QUADRO = 900;

export default function App() {
  const {
    pronto,
    estado,
    tema,
    alternarTema,
    usuarioAtual,
    definirUsuarioAtual,
    multiusuario,
    sessaoAtiva,
  } = useApp();

  const [pagina, setPagina] = useState<Pagina>('quadro');
  const [busca, setBusca] = useState('');
  const [soAtrasadas, setSoAtrasadas] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<Ordem>('leito');
  // Visualização: o usuário decide pelo botão, e a primeira abertura adivinha
  // pela largura da tela.
  const [compacto, setCompacto] = useState<boolean>(() => {
    const salvo = localStorage.getItem(CHAVE_VISTA);
    if (salvo === 'celular') return true;
    if (salvo === 'quadro') return false;
    return window.innerWidth < LARGURA_MINIMA_QUADRO;
  });
  const [sidebarAberta, setSidebarAberta] = useState(
    () => window.innerWidth >= LARGURA_MINIMA_QUADRO
  );
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  useEffect(() => {
    localStorage.setItem(CHAVE_VISTA, compacto ? 'celular' : 'quadro');
    // Em celular a gaveta começa fechada: o quadro é o que importa.
    if (compacto) setSidebarAberta(false);
  }, [compacto]);

  const [admitindo, setAdmitindo] = useState(false);
  const [registrando, setRegistrando] = useState<Paciente | null>(null);
  const [anamnese, setAnamnese] = useState<Paciente | null>(null);
  const [editando, setEditando] = useState<Paciente | null>(null);
  const [editorAberto, setEditorAberto] = useState(false);
  const [encerrando, setEncerrando] = useState<Paciente | null>(null);

  const ativas = estado.pacientes.filter(
    (p) => !p.arquivada && p.sessaoId === sessaoAtiva.id
  );
  const atrasadas = useMemo(
    () =>
      ativas.filter((p) => situacaoControle(p, estado.controles).estado === 'atrasado').length,
    [ativas, estado.controles]
  );

  if (!pronto) {
    return <p style={{ padding: 32 }}>Carregando o quadro…</p>;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
      <Sidebar
        pagina={pagina}
        irPara={setPagina}
        aberta={sidebarAberta}
        sobreposta={compacto}
        onFechar={() => setSidebarAberta(false)}
      />

      <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {compacto ? (
          <header
            style={{
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <button
                type="button"
                className="btn btn--icon"
                style={{ width: 40, height: 40, flex: '0 0 40px' }}
                onClick={() => setSidebarAberta(true)}
                aria-label="Abrir o menu"
              >
                ☰
              </button>
              <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {pagina === 'quadro' ? sessaoAtiva.nome : titulo(pagina)}
                </h1>
                <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                  {ativas.length} ativas · {atrasadas} atrasada{atrasadas === 1 ? '' : 's'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn--icon"
                style={{ width: 40, height: 40, flex: '0 0 40px' }}
                onClick={alternarTema}
                aria-label={`Mudar para tema ${tema === 'claro' ? 'escuro' : 'claro'}`}
              >
                {tema === 'claro' ? '☾' : '☀'}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: '0 0 auto', height: 40, padding: '0 14px' }}
                onClick={() => setAdmitindo(true)}
              >
                ✚ Admitir
              </button>
            </div>

            {pagina === 'quadro' && (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="field" style={{ flex: '1 1 auto', height: 40 }}>
                    <label className="sr-only" htmlFor="busca-compacta">
                      Buscar por nome ou leito
                    </label>
                    <input
                      id="busca-compacta"
                      type="search"
                      placeholder="Buscar…"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: '0 0 auto',
                      height: 40,
                      padding: '0 12px',
                      ...(soAtrasadas
                        ? {
                            borderColor: 'var(--color-late)',
                            background: 'var(--alert-soft)',
                            color: 'var(--alert-text)',
                            fontWeight: 600,
                          }
                        : {}),
                    }}
                    onClick={() => setSoAtrasadas((v) => !v)}
                    aria-pressed={soAtrasadas}
                  >
                    ⚠ {atrasadas}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ flex: '0 0 auto', height: 40, padding: '0 12px' }}
                    onClick={() => setFiltrosAbertos((v) => !v)}
                    aria-expanded={filtrosAbertos}
                  >
                    Filtros {filtrosAbertos ? '▴' : '▾'}
                  </button>
                </div>

                {filtrosAbertos && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <div className="field" style={{ flex: '1 1 150px', height: 40 }}>
                      <label className="sr-only" htmlFor="filtro-cat-c">
                        Filtrar por categoria
                      </label>
                      <select
                        id="filtro-cat-c"
                        value={categoriaFiltro ?? ''}
                        onChange={(e) => setCategoriaFiltro(e.target.value || null)}
                      >
                        <option value="">Todas as categorias</option>
                        {estado.categorias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field" style={{ flex: '1 1 150px', height: 40 }}>
                      <label className="sr-only" htmlFor="ordem-c">
                        Ordenar por
                      </label>
                      <select
                        id="ordem-c"
                        value={ordem}
                        onChange={(e) => setOrdem(e.target.value as Ordem)}
                      >
                        <option value="leito">Ordenar por leito</option>
                        <option value="atraso">Mais atrasadas primeiro</option>
                        <option value="categoria">Por categoria</option>
                      </select>
                    </div>
                    <div className="field" style={{ flex: '1 1 150px', height: 40 }}>
                      <label className="sr-only" htmlFor="usuario-c">
                        Usuário desta sessão
                      </label>
                      <select
                        id="usuario-c"
                        value={usuarioAtual.id}
                        onChange={(e) => definirUsuarioAtual(e.target.value)}
                      >
                        {estado.usuarios.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      style={{ flex: '1 1 150px', height: 40 }}
                      onClick={() => {
                        setEditando(null);
                        setEditorAberto(true);
                      }}
                      disabled={ativas.length === 0}
                    >
                      ✎ Editar paciente
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ flex: '1 1 150px', height: 40 }}
                      onClick={() => setCompacto(false)}
                    >
                      🖥 Ver como quadro
                    </button>
                  </div>
                )}
              </>
            )}
          </header>
        ) : (
        <header
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            padding: '14px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <button
            type="button"
            className="btn btn--icon"
            onClick={() => setSidebarAberta((v) => !v)}
            aria-label={sidebarAberta ? 'Recolher o menu lateral' : 'Abrir o menu lateral'}
            aria-expanded={sidebarAberta}
            title={sidebarAberta ? 'Recolher o menu' : 'Abrir o menu'}
            style={{ flex: '0 0 34px' }}
          >
            ☰
          </button>
          <div style={{ flex: '0 0 auto' }}>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: -0.2 }}>
              {pagina === 'quadro' ? sessaoAtiva.nome : titulo(pagina)}
            </h1>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
              {new Date().toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}{' '}
              · {horaHM(new Date().toISOString())} · {ativas.length} pacientes ativas
            </div>
          </div>

          {pagina === 'quadro' && (
            <>
              <div
                className="field"
                style={{ flex: '1 1 200px', minWidth: 160 }}
              >
                <label className="sr-only" htmlFor="busca">
                  Buscar por nome ou leito
                </label>
                <input
                  id="busca"
                  type="search"
                  placeholder="Buscar por nome ou leito…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setSoAtrasadas(false);
                    setCategoriaFiltro(null);
                  }}
                  aria-pressed={!soAtrasadas && categoriaFiltro === null}
                >
                  Todas
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSoAtrasadas((v) => !v)}
                  aria-pressed={soAtrasadas}
                  style={
                    soAtrasadas
                      ? {
                          borderColor: 'var(--color-late)',
                          background: 'var(--alert-soft)',
                          color: 'var(--alert-text)',
                          fontWeight: 600,
                        }
                      : { borderColor: atrasadas > 0 ? 'var(--color-late)' : undefined }
                  }
                >
                  ⚠ Atrasadas
                  <span
                    style={{
                      background: 'var(--color-late)',
                      color: '#fff',
                      borderRadius: 20,
                      padding: '1px 7px',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {atrasadas}
                  </span>
                </button>
                <div className="field" style={{ width: 160 }}>
                  <label className="sr-only" htmlFor="filtro-cat">
                    Filtrar por categoria
                  </label>
                  <select
                    id="filtro-cat"
                    value={categoriaFiltro ?? ''}
                    onChange={(e) => setCategoriaFiltro(e.target.value || null)}
                  >
                    <option value="">Todas as categorias</option>
                    {estado.categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ width: 170 }}>
                  <label className="sr-only" htmlFor="ordem">
                    Ordenar por
                  </label>
                  <select
                    id="ordem"
                    value={ordem}
                    onChange={(e) => setOrdem(e.target.value as Ordem)}
                  >
                    <option value="leito">Ordenar por leito</option>
                    <option value="atraso">Mais atrasadas primeiro</option>
                    <option value="categoria">Por categoria</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div style={{ flex: '0 0 auto', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="field" style={{ width: 190 }}>
              <label className="sr-only" htmlFor="usuario">
                Usuário desta sessão
              </label>
              <select
                id="usuario"
                value={usuarioAtual.id}
                onChange={(e) => definirUsuarioAtual(e.target.value)}
              >
                {estado.usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} · {FUNCAO_LABEL[u.funcao]}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn--icon"
              onClick={() => setCompacto(true)}
              aria-label="Ver em formato de celular"
              title="Ver em formato de celular"
            >
              📱
            </button>
            <button
              type="button"
              className="btn btn--icon"
              onClick={alternarTema}
              aria-label={`Mudar para tema ${tema === 'claro' ? 'escuro' : 'claro'}`}
              title={`Tema ${tema}`}
            >
              {tema === 'claro' ? '☾' : '☀'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditando(null);
                setEditorAberto(true);
              }}
              disabled={ativas.length === 0}
              title="Editar nome, idade, IG, situação e leito"
            >
              ✎ Editar paciente
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setAdmitindo(true)}>
              ✚ Admitir Paciente
            </button>
          </div>
        </header>
        )}

        <div
          style={{
            background: 'var(--head-bg)',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-dim)',
            padding: '7px 24px',
            fontSize: 11,
          }}
        >
          Ambiente de demonstração — não insira dados reais de pacientes.
          {!multiusuario &&
            ' Modo local: os dados ficam neste navegador. Configure o Supabase para multiusuário.'}
        </div>

        <AbasSessoes />

        {pagina === 'quadro' && (
          <QuadroPacientes
            busca={busca}
            soAtrasadas={soAtrasadas}
            categoriaFiltro={categoriaFiltro}
            ordem={ordem}
            compacto={compacto}
            onRegistrar={setRegistrando}
            onAnamnese={setAnamnese}
            onEditar={(p) => {
              setEditando(p);
              setEditorAberto(true);
            }}
            onEncerrar={setEncerrando}
          />
        )}
        {pagina === 'leitos' && <ConfigLeitos />}
        {pagina === 'categorias' && <ConfigCategorias />}
        {pagina === 'exames' && <PaginaExames />}
        {pagina === 'arquivadas' && <PaginaArquivadas />}
        {pagina === 'auditoria' && <PaginaAuditoria />}
      </div>

      {admitindo && <ModalAdmissao onFechar={() => setAdmitindo(false)} />}
      {registrando && (
        <ModalControles paciente={registrando} onFechar={() => setRegistrando(null)} />
      )}
      {anamnese && (
        <ModalAnamnese
          paciente={anamnese}
          onFechar={() => setAnamnese(null)}
          onEditarDados={(p) => {
            setAnamnese(null);
            setEditando(p);
            setEditorAberto(true);
          }}
        />
      )}
      {editorAberto && (
        <ModalEditarPaciente
          paciente={editando}
          onFechar={() => {
            setEditorAberto(false);
            setEditando(null);
          }}
        />
      )}
      {encerrando && (
        <ModalEncerrar paciente={encerrando} onFechar={() => setEncerrando(null)} />
      )}
    </div>
  );
}

function titulo(p: Pagina): string {
  const mapa: Record<Pagina, string> = {
    quadro: 'Quadro de Pacientes',
    exames: 'Exames e Programações',
    leitos: 'Leitos',
    categorias: 'Categorias',
    arquivadas: 'Arquivadas',
    auditoria: 'Histórico de alterações',
  };
  return mapa[p];
}

function PaginaExames() {
  const { estado, alternarExame, sessaoAtiva } = useApp();
  const daSessao = new Set(
    estado.pacientes.filter((p) => p.sessaoId === sessaoAtiva.id).map((p) => p.id)
  );
  const pendentes = estado.exames
    .filter((e) => !e.realizado && daSessao.has(e.pacienteId))
    .sort((a, b) => (a.horarioProgramado ?? '99:99').localeCompare(b.horarioProgramado ?? '99:99'));

  return (
    <div style={{ padding: '20px 24px 36px', maxWidth: 820 }}>
      <h2 className="sec">Pendências do plantão, por horário</h2>
      <div className="card" style={{ padding: 4 }}>
        {pendentes.length === 0 && (
          <p style={{ padding: 20, margin: 0, color: 'var(--text-dim)' }}>
            Nenhuma pendência no momento.
          </p>
        )}
        {pendentes.map((e) => {
          const paciente = estado.pacientes.find((p) => p.id === e.pacienteId);
          const leito = estado.leitos.find((l) => l.id === paciente?.leitoId);
          return (
            <label
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              <input
                type="checkbox"
                checked={e.realizado}
                onChange={() => alternarExame(e)}
                style={{ width: 16, height: 16, accentColor: 'var(--color-plum-700)', flex: '0 0 16px', margin: 0 }}
              />
              <strong style={{ flex: '0 0 62px', fontSize: 13 }}>
                {e.horarioProgramado ?? '—'}
              </strong>
              <span style={{ flex: '0 0 60px', color: 'var(--text-dim)', fontSize: 12 }}>
                {leito?.nome ?? '—'}
              </span>
              <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                {e.texto}
                <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: 11.5 }}>
                  {paciente?.nome}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function PaginaArquivadas() {
  const { estado, reabrir, sessaoAtiva } = useApp();
  const arquivadas = estado.pacientes.filter(
    (p) => p.arquivada && p.sessaoId === sessaoAtiva.id
  );
  const livres = estado.leitos.filter(
    (l) => l.sessaoId === sessaoAtiva.id && l.status === 'livre' && l.ativo
  );

  return (
    <div style={{ padding: '20px 24px 36px', maxWidth: 900 }}>
      <h2 className="sec">Arquivadas</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 12.5, marginTop: 0 }}>
        Nada é excluído: cada paciente mantém todo o histórico de controles, exames e
        auditoria, e pode ser reaberta em um leito livre.
      </p>
      <div className="card" style={{ padding: 4 }}>
        {arquivadas.length === 0 && (
          <p style={{ padding: 20, margin: 0, color: 'var(--text-dim)' }}>
            Nenhuma paciente arquivada em {sessaoAtiva.nome}.
          </p>
        )}
        {arquivadas.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderBottom: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ flex: '1 1 220px', minWidth: 0 }}>
              <strong>{p.nome}</strong>
              <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: 11.5 }}>
                {p.desfecho ? DESFECHO_LABEL[p.desfecho.tipo] : STATUS_LABEL[p.status]}
                {p.desfecho?.transferidaPara ? ` para ${p.desfecho.transferidaPara}` : ''}
                {p.desfecho?.causa ? ` · ${p.desfecho.causa}` : ''}
                {p.arquivadaEm ? ` · ${horaHM(p.arquivadaEm)}` : ''}
              </span>
            </span>
            <button
              type="button"
              className="btn"
              disabled={livres.length === 0}
              onClick={() => reabrir(p.id, livres[0].id)}
              title={livres.length === 0 ? 'Nenhum leito livre' : `Reabrir no leito ${livres[0].nome}`}
            >
              Reabrir {livres.length > 0 ? `no leito ${livres[0].nome}` : ''}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaginaAuditoria() {
  const { estado } = useApp();
  return (
    <div style={{ padding: '20px 24px 36px', maxWidth: 860 }}>
      <h2 className="sec">Histórico de alterações</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 12.5, marginTop: 0 }}>
        Somente leitura: nenhuma tela do app edita ou apaga registros de auditoria.
      </p>
      <div className="card" style={{ padding: 4 }}>
        {estado.auditoria.length === 0 && (
          <p style={{ padding: 20, margin: 0, color: 'var(--text-dim)' }}>
            Nenhuma alteração registrada nesta sessão.
          </p>
        )}
        {estado.auditoria.map((a) => {
          const paciente = estado.pacientes.find((p) => p.id === a.pacienteId);
          return (
            <div
              key={a.id}
              style={{
                display: 'flex',
                gap: 12,
                padding: '10px 14px',
                borderBottom: '1px solid var(--border)',
                fontSize: 12.5,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 26,
                  height: 26,
                  flex: '0 0 26px',
                  borderRadius: '50%',
                  background: 'var(--color-plum-700)',
                  color: 'var(--color-plum-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {iniciais(a.usuarioNome)}
              </span>
              <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                <strong>{a.usuarioNome}</strong> — {a.acao.replace(/_/g, ' ')}
                {paciente ? ` · ${paciente.nome}` : ''}
                {a.campo ? ` · ${a.campo}` : ''}
                {a.valorAnterior || a.valorNovo
                  ? ` · de “${a.valorAnterior ?? '—'}” para “${a.valorNovo ?? '—'}”`
                  : ''}
              </span>
              <span style={{ flex: '0 0 auto', color: 'var(--text-dim)' }}>
                {horaHM(a.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
