import { useState } from 'react';
import type { Categoria, Paciente } from '../types';
import { useApp } from '../state/store';
import { estiloCategoria } from '../lib/contrast';
import { estiloPainel, usePosicaoAncorada } from './usePosicaoAncorada';

type Pendente =
  | { tipo: 'situacao'; categoria: Categoria }
  | { tipo: 'transferencia'; leitoId: string }
  | null;

/**
 * Caixa de edição do leito: abre no próprio retângulo do leito, no quadro.
 *
 * Toda ação daqui passa por uma confirmação que diz em palavras o que vai
 * acontecer — trocar a situação de uma paciente e transferi-la de leito são
 * coisas que ninguém deve conseguir fazer com um clique torto no plantão.
 */
const LARGURA = 268;

export function MenuLeito({
  paciente,
  ancora,
  onFechar,
  onAnamnese,
  onEditar,
  onExames,
  onEncerrar,
}: {
  paciente: Paciente;
  /** O botão do leito. A caixa é posicionada na tela a partir dele. */
  ancora: HTMLElement | null;
  onFechar(): void;
  onAnamnese(p: Paciente): void;
  onEditar(p: Paciente): void;
  onExames(p: Paciente): void;
  onEncerrar(p: Paciente): void;
}) {
  const { estado, tema, sessaoAtiva, mudarCategoria, transferirLeito, renomearLeito } =
    useApp();
  const [pendente, setPendente] = useState<Pendente>(null);

  // A caixa é ancorada na tela: dentro da linha ela era cortada pelo contêiner
  // da tabela, que tem overflow hidden para arredondar os cantos.
  const [refCaixa, pos] = usePosicaoAncorada(ancora, 'esquerda', pendente);
  const [leitoDestino, setLeitoDestino] = useState('');
  const [renomeando, setRenomeando] = useState(false);
  const [nome, setNome] = useState('');

  const superficie = tema === 'escuro' ? '#1E1228' : '#FFFFFF';
  const atual = estado.categorias.find((c) => c.id === paciente.categoriaId);
  const leito = estado.leitos.find((l) => l.id === paciente.leitoId);

  const daSessao = estado.leitos.filter(
    (l) => l.sessaoId === sessaoAtiva.id && l.id !== paciente.leitoId
  );
  const livres = daSessao.filter((l) => l.status === 'livre' && l.ativo);

  const ocupantePorLeito = new Map(
    estado.pacientes
      .filter((p) => !p.arquivada && p.leitoId)
      .map((p) => [p.leitoId as string, p.nome])
  );

  // Mesma regra da admissão: mostrar todos e dizer por que cada um não serve.
  const motivo = (l: (typeof daSessao)[number]): string | null => {
    if (!l.ativo) return 'inativo';
    if (l.status === 'ocupado') return ocupantePorLeito.get(l.id) ?? 'ocupado';
    if (l.status === 'limpeza') return 'em limpeza';
    if (l.status === 'bloqueado') return 'bloqueado';
    return null;
  };

  const confirmar = () => {
    if (!pendente) return;
    if (pendente.tipo === 'situacao') {
      mudarCategoria(paciente.id, pendente.categoria.id);
    } else {
      transferirLeito(paciente.id, pendente.leitoId);
    }
    setPendente(null);
    onFechar();
  };

  const nomeDestino = (id: string) => estado.leitos.find((l) => l.id === id)?.nome ?? '';

  return (
    <>
      <div
        role="presentation"
        onClick={onFechar}
        style={{ position: 'fixed', inset: 0, zIndex: 70 }}
      />
      <div
        ref={refCaixa}
        role="dialog"
        aria-label={`Editar leito ${leito?.nome ?? ''}`}
        style={{ ...estiloPainel(pos, LARGURA), padding: 12 }}
      >
        <div style={{ marginBottom: 10 }}>
          {renomeando && leito ? (
            <div className="field" style={{ height: 34 }}>
              <label className="sr-only" htmlFor={`nome-leito-${leito.id}`}>
                Nome do leito
              </label>
              <input
                id={`nome-leito-${leito.id}`}
                autoFocus
                value={nome}
                onChange={(ev) => setNome(ev.target.value)}
                onBlur={() => {
                  renomearLeito(leito.id, nome);
                  setRenomeando(false);
                }}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter') {
                    renomearLeito(leito.id, nome);
                    setRenomeando(false);
                  }
                  if (ev.key === 'Escape') setRenomeando(false);
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong style={{ fontSize: 13 }}>Leito {leito?.nome ?? '—'}</strong>
              {leito && (
                <button
                  type="button"
                  onClick={() => {
                    setNome(leito.nome);
                    setRenomeando(true);
                  }}
                  aria-label={`Renomear o leito ${leito.nome}`}
                  title="Renomear o leito"
                  style={{
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    fontSize: 12,
                    padding: 2,
                    lineHeight: 1,
                  }}
                >
                  ✎
                </button>
              )}
            </div>
          )}
          <span
            style={{
              display: 'block',
              color: 'var(--text-dim)',
              fontSize: 11.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {paciente.nome}
          </span>
        </div>

        {pendente ? (
          <Confirmacao
            texto={
              pendente.tipo === 'situacao'
                ? `Mudar a situação de ${atual?.descricao ?? atual?.nome ?? '—'} para ${
                    pendente.categoria.descricao ?? pendente.categoria.nome
                  }?`
                : `Transferir ${paciente.nome} do leito ${leito?.nome ?? '—'} para o leito ${nomeDestino(
                    pendente.leitoId
                  )}? O leito ${leito?.nome ?? ''} fica livre.`
            }
            onCancelar={() => setPendente(null)}
            onConfirmar={confirmar}
          />
        ) : (
          <>
            <Rotulo>Situação</Rotulo>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
              {estado.categorias.map((c) => {
                const e = estiloCategoria(c.cor, superficie, 9, tema === 'escuro');
                const ativa = c.id === paciente.categoriaId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={ativa}
                    title={c.descricao ?? c.nome}
                    onClick={() => setPendente({ tipo: 'situacao', categoria: c })}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      height: 28,
                      padding: '0 9px',
                      borderRadius: 7,
                      border: `1px solid ${ativa ? e.barra : 'var(--border)'}`,
                      background: ativa ? e.chipBg : 'transparent',
                      color: ativa ? e.texto : 'var(--text)',
                      fontSize: 11.5,
                      fontWeight: ativa ? 700 : 500,
                      cursor: ativa ? 'default' : 'pointer',
                      opacity: ativa ? 1 : 0.95,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 4,
                        height: 13,
                        borderRadius: 2,
                        background: e.barra,
                        display: 'inline-block',
                      }}
                    />
                    {c.nome}
                    {ativa ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>

            <Rotulo>Transferir de leito</Rotulo>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <div className="field" style={{ flex: '1 1 auto', height: 32 }}>
                <label className="sr-only" htmlFor={`destino-${paciente.id}`}>
                  Leito de destino
                </label>
                <select
                  id={`destino-${paciente.id}`}
                  value={leitoDestino}
                  onChange={(ev) => setLeitoDestino(ev.target.value)}
                >
                  <option value="">
                    {livres.length
                      ? `Escolher entre ${livres.length} livre(s)…`
                      : 'Nenhum leito livre'}
                  </option>
                  {daSessao.map((l) => {
                    const porque = motivo(l);
                    return (
                      <option key={l.id} value={l.id} disabled={porque !== null}>
                        {l.nome}
                        {porque ? ` — ${porque}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                type="button"
                className="btn"
                style={{ height: 32, padding: '0 10px', fontSize: 11.5 }}
                disabled={!leitoDestino}
                onClick={() => setPendente({ tipo: 'transferencia', leitoId: leitoDestino })}
              >
                Mover
              </button>
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '0 0 8px' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Item
                onClick={() => {
                  onFechar();
                  onAnamnese(paciente);
                }}
              >
                Anamnese
                {paciente.anamnese?.trim() ? (
                  <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> · preenchida</span>
                ) : null}
              </Item>
              <Item
                onClick={() => {
                  onFechar();
                  onEditar(paciente);
                }}
              >
                Editar dados da paciente
              </Item>
              <Item
                onClick={() => {
                  onFechar();
                  onExames(paciente);
                }}
              >
                Exames e programações
              </Item>
              <Item
                destaque
                onClick={() => {
                  onFechar();
                  onEncerrar(paciente);
                }}
              >
                Arquivar / encerrar atendimento…
              </Item>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Confirmacao({
  texto,
  onCancelar,
  onConfirmar,
}: {
  texto: string;
  onCancelar(): void;
  onConfirmar(): void;
}) {
  return (
    <div>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.55 }}>{texto}</p>
      <div style={{ display: 'flex', gap: 7 }}>
        <button
          type="button"
          className="btn"
          style={{ flex: '1 1 0', height: 34 }}
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--primary"
          style={{ flex: '1 1 0', height: 34 }}
          onClick={onConfirmar}
          autoFocus
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: 'var(--text-dim)',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Item({
  children,
  onClick,
  destaque = false,
}: {
  children: React.ReactNode;
  onClick(): void;
  destaque?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: 0,
        background: 'transparent',
        textAlign: 'left',
        padding: '8px 9px',
        minHeight: 36,
        borderRadius: 7,
        cursor: 'pointer',
        fontSize: 12.5,
        color: destaque ? 'var(--alert-text)' : 'var(--text)',
        fontWeight: destaque ? 600 : 400,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}
