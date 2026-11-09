import { useMemo, useState } from 'react';
import type { Paciente } from './types';
import { useApp } from './state/store';
import { Sidebar, iniciais, type Pagina } from './components/Sidebar';
import { QuadroPacientes } from './components/QuadroPacientes';
import { ModalAdmissao } from './components/ModalAdmissao';
import { ModalControles } from './components/ModalControles';
import { ConfigLeitos } from './components/ConfigLeitos';
import { ConfigCategorias } from './components/ConfigCategorias';
import { horaHM, situacaoControle } from './lib/calc';
import { FUNCAO_LABEL, STATUS_LABEL } from './types';

type Ordem = 'leito' | 'atraso' | 'categoria';

export default function App() {
  const { pronto, estado, tema, alternarTema, usuarioAtual, definirUsuarioAtual, multiusuario } =
    useApp();

  const [pagina, setPagina] = useState<Pagina>('quadro');
  const [busca, setBusca] = useState('');
  const [soAtrasadas, setSoAtrasadas] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<Ordem>('leito');
  const [admitindo, setAdmitindo] = useState(false);
  const [registrando, setRegistrando] = useState<Paciente | null>(null);

  const ativas = estado.pacientes.filter((p) => !p.arquivada);
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
      <Sidebar pagina={pagina} irPara={setPagina} />

      <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* TOPBAR */}
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
          <div style={{ flex: '0 0 auto' }}>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: -0.2 }}>
              {pagina === 'quadro' ? 'Quadro de Pacientes' : titulo(pagina)}
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
              onClick={alternarTema}
              aria-label={`Mudar para tema ${tema === 'claro' ? 'escuro' : 'claro'}`}
              title={`Tema ${tema}`}
            >
              {tema === 'claro' ? '☾' : '☀'}
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setAdmitindo(true)}>
              ✚ Admitir Paciente
            </button>
          </div>
        </header>

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

        {pagina === 'quadro' && (
          <QuadroPacientes
            busca={busca}
            soAtrasadas={soAtrasadas}
            categoriaFiltro={categoriaFiltro}
            ordem={ordem}
            onRegistrar={setRegistrando}
            onAbrirPaciente={setRegistrando}
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
  const { estado, alternarExame } = useApp();
  const pendentes = estado.exames
    .filter((e) => !e.realizado)
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
  const { estado, reabrir } = useApp();
  const arquivadas = estado.pacientes.filter((p) => p.arquivada);
  const livres = estado.leitos.filter((l) => l.status === 'livre' && l.ativo);

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
            Nenhuma paciente arquivada.
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
                {STATUS_LABEL[p.status]}
                {p.desfecho?.transferidaPara ? ` para ${p.desfecho.transferidaPara}` : ''}
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
