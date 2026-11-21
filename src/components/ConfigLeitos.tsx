import { useMemo, useState } from 'react';
import type { Leito, StatusLeito, TipoLeito } from '../types';
import { STATUS_LEITO_LABEL } from '../types';
import { useApp } from '../state/store';
import { Aviso, Campo } from './ui';
import { novoId } from '../lib/calc';

const ESTILO: Record<StatusLeito, { cor: string; bg: string; borda: string; texto: string }> = {
  ocupado: {
    cor: 'var(--color-plum-700)',
    bg: 'rgba(97,36,133,0.09)',
    borda: 'var(--color-plum-700)',
    texto: 'var(--color-plum-800)',
  },
  livre: {
    cor: 'var(--color-ok)',
    bg: 'rgba(5,150,105,0.08)',
    borda: 'var(--color-ok)',
    texto: 'var(--ok-text)',
  },
  limpeza: {
    cor: 'var(--color-warn)',
    bg: 'rgba(232,163,60,0.11)',
    borda: 'var(--color-warn)',
    texto: 'var(--warn-text)',
  },
  bloqueado: {
    cor: '#9CA3AF',
    bg: 'var(--app-bg)',
    borda: 'var(--border)',
    texto: 'var(--text-dim)',
  },
};

const TIPO_LABEL: Record<TipoLeito, string> = {
  fixo: 'Fixo',
  extra: 'Extra',
  personalizado: 'Personalizado',
};

export function ConfigLeitos() {
  const { estado, salvarLeito, liberarLeito, sessaoAtiva } = useApp();
  const [editando, setEditando] = useState<Leito | null>(null);

  // Cada sessão tem o seu próprio conjunto de leitos.
  const leitos = useMemo(
    () => estado.leitos.filter((l) => l.sessaoId === sessaoAtiva.id),
    [estado.leitos, sessaoAtiva.id]
  );

  const ocupantes = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of estado.pacientes) {
      if (!p.arquivada && p.leitoId) mapa.set(p.leitoId, p.nome);
    }
    return mapa;
  }, [estado.pacientes]);

  const contagem = useMemo(() => {
    const c: Record<StatusLeito, number> = { ocupado: 0, livre: 0, limpeza: 0, bloqueado: 0 };
    for (const l of leitos) c[l.status]++;
    return c;
  }, [leitos]);

  const novo = (): Leito => ({
    id: novoId('leito'),
    sessaoId: sessaoAtiva.id,
    nome: '',
    tipo: 'personalizado',
    status: 'livre',
    ativo: true,
  });

  return (
    <div style={{ padding: '20px 24px 36px' }}>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 11.5, marginBottom: 4 }}>
            Configurações › Leitos
          </div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: -0.3 }}>
            Leitos · {sessaoAtiva.nome}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: 12.5, maxWidth: 620 }}>
            Leitos fixos A a L e três extras já vêm cadastrados. Qualquer leito pode ser
            renomeado ou desativado, e novos podem ser criados — toda alteração fica no log
            de auditoria.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditando(novo())}>
          ✚ Cadastrar leito
        </button>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 20 }}>
        {(Object.keys(contagem) as StatusLeito[]).map((s) => (
          <div
            key={s}
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 9, height: 40, padding: '0 14px' }}
          >
            <span
              aria-hidden="true"
              style={{ width: 9, height: 9, borderRadius: '50%', background: ESTILO[s].cor }}
            />
            <strong style={{ fontSize: 15 }}>{contagem[s]}</strong>
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
              {STATUS_LEITO_LABEL[s].toLowerCase()}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* MAPA */}
          <section className="card" style={{ padding: 18 }}>
            <h2 className="sec">Mapa de ocupação</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 10,
              }}
            >
              {leitos.map((l) => {
                const e = ESTILO[l.status];
                const ocupante = ocupantes.get(l.id);
                return (
                  <div
                    key={l.id}
                    style={{
                      border: `1px solid ${e.borda}`,
                      borderLeft: `4px solid ${e.borda}`,
                      borderRadius: 10,
                      background: e.bg,
                      padding: '10px 11px',
                      minHeight: 92,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      opacity: l.ativo ? 1 : 0.55,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{l.nome}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: e.texto }}>
                      {STATUS_LEITO_LABEL[l.status]}
                      {!l.ativo ? ' · inativo' : ''}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-dim)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ocupante ?? l.observacao ?? '—'}
                    </span>
                    <div style={{ marginTop: 'auto', display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ height: 28, padding: '0 9px', fontSize: 11.5 }}
                        onClick={() => setEditando(l)}
                      >
                        Editar
                      </button>
                      {l.status === 'limpeza' && (
                        <button
                          type="button"
                          className="btn"
                          style={{ height: 28, padding: '0 9px', fontSize: 11.5 }}
                          onClick={() => liberarLeito(l.id)}
                        >
                          Liberar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* TABELA */}
          <section className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px 12px' }}>
              <h2 className="sec" style={{ margin: 0 }}>
                Cadastro de leitos
              </h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                <thead>
                  <tr
                    style={{
                      background: 'var(--head-bg)',
                      color: 'var(--text-dim)',
                      fontSize: 10.5,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {['Leito', 'Tipo', 'Status', 'Paciente', 'Ativo', 'Ações'].map((h, i) => (
                      <th
                        key={h}
                        scope="col"
                        style={{
                          textAlign: i === 5 ? 'right' : 'left',
                          padding: i === 0 ? '9px 18px' : i === 5 ? '9px 18px' : '9px 10px',
                          fontWeight: 700,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leitos.map((l) => {
                    const e = ESTILO[l.status];
                    const ocupado = l.status === 'ocupado';
                    return (
                      <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <th scope="row" style={{ textAlign: 'left', padding: '11px 18px', fontWeight: 700, fontSize: 13 }}>
                          {l.nome}
                        </th>
                        <td style={{ padding: '11px 10px', color: 'var(--text-dim)', fontSize: 12 }}>
                          {TIPO_LABEL[l.tipo]}
                        </td>
                        <td style={{ padding: '11px 10px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              height: 23,
                              padding: '0 9px',
                              borderRadius: 20,
                              background: e.bg,
                              border: `1px solid ${e.borda}`,
                              color: e.texto,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {STATUS_LEITO_LABEL[l.status]}
                          </span>
                        </td>
                        <td style={{ padding: '11px 10px', fontSize: 12 }}>
                          {ocupantes.get(l.id) ?? '—'}
                        </td>
                        <td style={{ padding: '11px 10px' }}>
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 7,
                              fontSize: 11.5,
                              color: 'var(--text-dim)',
                              cursor: ocupado ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={l.ativo}
                              disabled={ocupado}
                              onChange={() => salvarLeito({ ...l, ativo: !l.ativo })}
                              style={{ width: 15, height: 15, accentColor: 'var(--color-plum-700)', margin: 0 }}
                            />
                            {l.ativo ? 'Ativo' : 'Inativo'}
                          </label>
                        </td>
                        <td style={{ padding: '11px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ height: 30, padding: '0 10px', fontSize: 11.5 }}
                            onClick={() => setEditando(l)}
                            disabled={ocupado}
                            title={ocupado ? 'Transfira a paciente antes de renomear' : undefined}
                          >
                            Renomear
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{
                              height: 30,
                              padding: '0 10px',
                              fontSize: 11.5,
                              marginLeft: 6,
                              color: ocupado ? undefined : 'var(--alert-text)',
                              borderColor: ocupado ? undefined : 'var(--color-late)',
                            }}
                            disabled={ocupado}
                            onClick={() => salvarLeito({ ...l, ativo: false })}
                            title={ocupado ? 'Transfira a paciente antes de desativar' : undefined}
                          >
                            Desativar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--border)',
                background: 'var(--app-bg)',
                color: 'var(--text-dim)',
                fontSize: 11.5,
              }}
            >
              {leitos.length} leitos cadastrados · um leito ocupado não pode ser
              renomeado nem desativado sem transferir a paciente antes.
            </div>
          </section>
        </div>

        {/* PAINEL DE EDIÇÃO — o mesmo da criação */}
        {editando && (
          <PainelLeito
            leito={editando}
            onFechar={() => setEditando(null)}
            onSalvar={(l) => {
              salvarLeito(l);
              setEditando(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function PainelLeito({
  leito,
  onFechar,
  onSalvar,
}: {
  leito: Leito;
  onFechar(): void;
  onSalvar(l: Leito): void;
}) {
  const [nome, setNome] = useState(leito.nome);
  const [tipo, setTipo] = useState<TipoLeito>(leito.tipo);
  const [status, setStatus] = useState<StatusLeito>(leito.status);
  const [observacao, setObservacao] = useState(leito.observacao ?? '');
  const [ativo, setAtivo] = useState(leito.ativo);

  const novoLeito = leito.nome === '';

  return (
    <aside
      aria-label={novoLeito ? 'Cadastrar leito' : `Editar leito ${leito.nome}`}
      className="card"
      style={{
        flex: '1 1 320px',
        minWidth: 300,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
          {novoLeito ? 'Cadastrar leito' : `Editar leito ${leito.nome}`}
        </h2>
        <p style={{ margin: '5px 0 0', color: 'var(--text-dim)', fontSize: 11.5 }}>
          O mesmo painel abre em branco ao cadastrar um leito novo.
        </p>
      </div>

      <Campo label="Nome exibido no quadro" dica="Aceita letra, número ou texto curto: J, 01A, PPP 2, Observação.">
        <input value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome do leito" />
      </Campo>

      <Campo label="Tipo">
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoLeito)} aria-label="Tipo de leito">
          {(Object.keys(TIPO_LABEL) as TipoLeito[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_LABEL[t]}
            </option>
          ))}
        </select>
      </Campo>

      <Campo label="Status">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusLeito)}
          aria-label="Status do leito"
          disabled={leito.status === 'ocupado'}
        >
          {(Object.keys(STATUS_LEITO_LABEL) as StatusLeito[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LEITO_LABEL[s]}
            </option>
          ))}
        </select>
      </Campo>

      <div>
        <label className="lbl" htmlFor="obs-leito">
          Observação interna
        </label>
        <textarea
          id="obs-leito"
          rows={2}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          style={{
            width: '100%',
            border: '1px solid var(--border)',
            borderRadius: 9,
            padding: '9px 10px',
            background: 'var(--surface)',
            color: 'var(--text)',
            resize: 'vertical',
            outline: 0,
          }}
        />
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 9,
          padding: '11px 12px',
          border: '1px solid var(--border)',
          borderRadius: 10,
          background: 'var(--app-bg)',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--color-plum-700)', margin: '1px 0 0', flex: '0 0 16px' }}
        />
        <span>
          <strong style={{ fontSize: 12.5 }}>Leito ativo</strong>
          <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: 11.5, marginTop: 2 }}>
            Desativado, ele sai da lista de admissão mas continua no histórico das pacientes
            que já o usaram. Desativar não é excluir.
          </span>
        </span>
      </label>

      <Aviso tom="atencao" titulo="Transferência libera o leito">
        Ao transferir uma paciente, o leito de origem passa automaticamente para “em
        limpeza”, e volta a “livre” pelo botão Liberar no mapa.
      </Aviso>

      <div style={{ display: 'flex', gap: 9, marginTop: 'auto' }}>
        <button type="button" className="btn" style={{ flex: '1 1 0' }} onClick={onFechar}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--primary"
          style={{ flex: '1 1 0' }}
          disabled={nome.trim() === ''}
          onClick={() =>
            onSalvar({
              ...leito,
              nome: nome.trim(),
              tipo,
              status,
              observacao: observacao.trim() || undefined,
              ativo,
            })
          }
        >
          Salvar leito
        </button>
      </div>
    </aside>
  );
}
