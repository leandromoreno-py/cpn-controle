import { useState } from 'react';
import { useApp } from '../state/store';

/**
 * Abas de sessão. Cada sessão é uma unidade com seus próprios leitos e
 * pacientes — o Centro de Parto é a primeira, e o usuário cria outras com o
 * mesmo quadro. Categorias, comorbidades e usuários são compartilhados.
 */
export function AbasSessoes() {
  const { estado, sessaoAtiva, definirSessaoAtiva, criarSessao, renomearSessao, excluirSessao } =
    useApp();

  const [criando, setCriando] = useState(false);
  const [nomeNovo, setNomeNovo] = useState('');
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');

  const confirmarCriacao = () => {
    if (!nomeNovo.trim()) return;
    criarSessao(nomeNovo);
    setNomeNovo('');
    setCriando(false);
  };

  const confirmarRenome = () => {
    if (renomeando && nomeEditado.trim()) renomearSessao(renomeando, nomeEditado);
    setRenomeando(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 12px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
      }}
      role="tablist"
      aria-label="Sessões"
    >
      {estado.sessoes.map((s) => {
        const ativa = s.id === sessaoAtiva.id;

        if (renomeando === s.id) {
          return (
            <div key={s.id} className="field" style={{ width: 200, margin: '6px 0', height: 34 }}>
              <label className="sr-only" htmlFor={`renome-${s.id}`}>
                Novo nome da sessão
              </label>
              <input
                id={`renome-${s.id}`}
                autoFocus
                value={nomeEditado}
                onChange={(e) => setNomeEditado(e.target.value)}
                onBlur={confirmarRenome}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmarRenome();
                  if (e.key === 'Escape') setRenomeando(null);
                }}
              />
            </div>
          );
        }

        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
            <button
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => definirSessaoAtiva(s.id)}
              onDoubleClick={() => {
                setRenomeando(s.id);
                setNomeEditado(s.nome);
              }}
              title="Duplo clique para renomear"
              style={{
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                padding: '11px 4px 9px 2px',
                minHeight: 44,
                color: ativa ? 'var(--text)' : 'var(--text-dim)',
                fontWeight: ativa ? 700 : 500,
                fontSize: 13,
                borderBottom: `2px solid ${ativa ? 'var(--color-plum-700)' : 'transparent'}`,
              }}
            >
              {s.nome}
            </button>
            {ativa && (
              <>
                <button
                  type="button"
                  className="btn btn--icon"
                  style={{ width: 26, height: 26, marginLeft: 4, border: 0, background: 'transparent' }}
                  aria-label={`Renomear a sessão ${s.nome}`}
                  title="Renomear"
                  onClick={() => {
                    setRenomeando(s.id);
                    setNomeEditado(s.nome);
                  }}
                >
                  ✎
                </button>
                {estado.sessoes.length > 1 && (
                  <button
                    type="button"
                    className="btn btn--icon"
                    style={{ width: 26, height: 26, border: 0, background: 'transparent' }}
                    aria-label={`Excluir a sessão ${s.nome}`}
                    title="Excluir sessão"
                    onClick={() => {
                      const pacientes = estado.pacientes.filter(
                        (p) => p.sessaoId === s.id && !p.arquivada
                      ).length;
                      const aviso =
                        pacientes > 0
                          ? `A sessão "${s.nome}" tem ${pacientes} paciente(s) ativa(s). Excluir apaga a sessão, seus leitos e todas as suas pacientes, inclusive as arquivadas. Isso não pode ser desfeito. Confirmar?`
                          : `Excluir a sessão "${s.nome}" e seus leitos? Isso não pode ser desfeito.`;
                      if (window.confirm(aviso)) excluirSessao(s.id);
                    }}
                  >
                    ✕
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}

      {criando ? (
        <div className="field" style={{ width: 200, margin: '6px 0 6px 8px', height: 34 }}>
          <label className="sr-only" htmlFor="nome-sessao">
            Nome da nova sessão
          </label>
          <input
            id="nome-sessao"
            autoFocus
            placeholder="Ex.: Alojamento conjunto"
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            onBlur={() => (nomeNovo.trim() ? confirmarCriacao() : setCriando(false))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmarCriacao();
              if (e.key === 'Escape') setCriando(false);
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCriando(true)}
          style={{
            flex: '0 0 auto',
            marginLeft: 8,
            border: '1px dashed var(--border)',
            borderRadius: 7,
            background: 'transparent',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '0 10px',
            height: 30,
            fontSize: 12,
          }}
          title="Criar uma sessão com os mesmos leitos e nenhuma paciente"
        >
          ＋ Nova sessão
        </button>
      )}
    </div>
  );
}
