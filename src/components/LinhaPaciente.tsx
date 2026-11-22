import { useMemo, useRef, useState } from 'react';
import type { Controle, Paciente } from '../types';
import { DU_LABEL, STATUS_LABEL } from '../types';
import { useApp } from '../state/store';
import { MenuLeito } from './MenuLeito';
import { TituloMedicacao, TrilhaDoses } from './TrilhaDoses';
import { estiloPainel, usePosicaoAncorada } from './usePosicaoAncorada';
import { estiloCategoria } from '../lib/contrast';
import {
  alertasClinicos,
  assinatura,
  calcularBalanco,
  controlesDe,
  debitoUrinario,
  diureseAnterior,
  formatarNumero,
  horaHM,
  idadeGestacional,
  paridade,
  situacaoControle,
} from '../lib/calc';

const COLUNAS =
  '78px minmax(190px, 1.25fr) 94px 80px minmax(170px, 1.3fr) 142px 132px 92px';

export interface Vital {
  label: string;
  valor: string;
  alerta: boolean;
}

/**
 * Uma paciente é UMA linha, em DOIS NÍVEIS.
 * Doze informações não cabem numa única fileira de colunas sem ficarem
 * ilegíveis: nível 1 identifica, nível 2 traz controles, medicações e exames.
 */
export function LinhaPaciente({
  paciente,
  onRegistrar,
  onAnamnese,
  onEditar,
  onExames,
  onMedicacoes,
  onEncerrar,
}: {
  paciente: Paciente;
  onRegistrar(p: Paciente): void;
  onAnamnese(p: Paciente): void;
  onEditar(p: Paciente): void;
  onExames(p: Paciente): void;
  onMedicacoes(p: Paciente): void;
  onEncerrar(p: Paciente): void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [leitoAberto, setLeitoAberto] = useState(false);
  const refLeito = useRef<HTMLButtonElement>(null);
  const refAcoes = useRef<HTMLButtonElement>(null);
  // Mesmo motivo da caixa do leito: ancorado na tela para não ser cortado.
  const [refMenu, posMenu] = usePosicaoAncorada(
    menuAberto ? refAcoes.current : null,
    'direita'
  );
  const { estado, tema, alternarExame } = useApp();

  const categoria = estado.categorias.find((c) => c.id === paciente.categoriaId);
  const leito = estado.leitos.find((l) => l.id === paciente.leitoId);
  const superficie = tema === 'escuro' ? '#1E1228' : '#FFFFFF';
  const estilo = useMemo(
    () => estiloCategoria(categoria?.cor ?? '#9CA3AF', superficie, 9, tema === 'escuro'),
    [categoria?.cor, superficie, tema]
  );

  const situacao = situacaoControle(paciente, estado.controles);
  const ultimo = situacao.ultimo;
  const meds = estado.medicacoes.filter(
    (m) => m.pacienteId === paciente.id && m.status === 'em_curso'
  );
  const exames = estado.exames.filter((e) => e.pacienteId === paciente.id);
  const vitais = montarVitais(paciente, ultimo, estado.controles);
  const toqueRecente = controlesDe(paciente.id, estado.controles).find(
    (c) => c.toque?.dilatacaoCm != null
  );

  const corEstado =
    situacao.estado === 'atrasado'
      ? { bg: 'var(--alert-soft)', borda: 'var(--color-late)', texto: 'var(--alert-text)' }
      : situacao.estado === 'vencendo'
        ? { bg: 'rgba(232,163,60,0.12)', borda: 'var(--color-warn)', texto: 'var(--warn-text)' }
        : { bg: 'rgba(5,150,105,0.10)', borda: 'var(--color-ok)', texto: 'var(--ok-text)' };

  return (
    <article
      style={{
        borderBottom: '1px solid var(--border)',
        borderLeft: `5px solid ${estilo.barra}`,
        background: estilo.linhaBg,
        padding: '12px 16px 12px 11px',
      }}
    >
      {/* NÍVEL 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: COLUNAS, gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <button
            ref={refLeito}
            type="button"
            onClick={() => setLeitoAberto((v) => !v)}
            title="Editar situação, transferir, anamnese e arquivamento"
            aria-expanded={leitoAberto}
            aria-label={`Editar o leito ${leito?.nome ?? 'sem leito'} de ${paciente.nome}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              minWidth: 44,
              height: 30,
              padding: '0 9px',
              borderRadius: 7,
              background: estilo.chipBg,
              border: `1px solid ${estilo.barra}`,
              color: estilo.texto,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {leito?.nome ?? '—'}
            {paciente.anamnese?.trim() ? (
              <span aria-hidden="true" title="Anamnese preenchida" style={{ fontSize: 10, opacity: 0.75 }}>
                ▤
              </span>
            ) : null}
            <span aria-hidden="true" style={{ fontSize: 8, opacity: 0.7 }}>
              ▾
            </span>
          </button>

          {leitoAberto && (
            <MenuLeito
              paciente={paciente}
              ancora={refLeito.current}
              onFechar={() => setLeitoAberto(false)}
              onAnamnese={onAnamnese}
              onEditar={onEditar}
              onExames={onExames}
              onMedicacoes={onMedicacoes}
              onEncerrar={onEncerrar}
            />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onEditar(paciente)}
              title="Editar dados da paciente"
              style={{
                border: 0,
                background: 'transparent',
                padding: 0,
                color: 'var(--text)',
                fontWeight: 600,
                fontSize: 13.5,
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {paciente.nome}
            </button>
            {paciente.idade != null && (
              <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{paciente.idade} anos</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                height: 20,
                alignItems: 'center',
                padding: '0 8px',
                borderRadius: 20,
                background: estilo.chipBg,
                color: estilo.texto,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {categoria?.nome ?? 'Não classificado'}
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
              {paciente.desfecho?.tipo === 'cesarea'
                ? `Cesárea ${horaHM(paciente.desfecho.horario)}`
                : paciente.desfecho?.tipo === 'parto_normal'
                  ? `Parto normal ${horaHM(paciente.desfecho.horario)}`
                  : STATUS_LABEL[paciente.status]}
            </span>
          </div>
        </div>

        <div style={{ fontWeight: 600, fontSize: 13 }}>{paridade(paciente)}</div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{idadeGestacional(paciente)}</div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {paciente.comorbidades.map((c) => (
            <span
              key={c}
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                background: 'var(--tag-bg)',
                border: '1px solid var(--border)',
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >
              {c}
            </span>
          ))}
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {toqueRecente?.toque?.dilatacaoCm != null
              ? `${toqueRecente.toque.dilatacaoCm} cm`
              : '—'}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
            {paciente.dinamicaUterina ? DU_LABEL[paciente.dinamicaUterina] : 'DU não avaliada'}
          </div>
        </div>

        <div>
          <span
            className={situacao.estado === 'atrasado' ? 'pulse' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 26,
              padding: '0 9px',
              borderRadius: 7,
              background: corEstado.bg,
              border: `1px solid ${corEstado.borda}`,
              color: corEstado.texto,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {situacao.estado === 'atrasado' && <span aria-hidden="true">⚠</span>}
            {situacao.label}
          </span>
          <div style={{ color: 'var(--text-dim)', fontSize: 10.5, marginTop: 3 }}>
            meta {formatarIntervalo(paciente.intervaloControleMin)}
            {ultimo ? (
              <span
                title={assinatura(ultimo.responsavelFuncao, ultimo.responsavelNome)}
              >{` · ${assinatura(
                ultimo.responsavelFuncao,
                ultimo.responsavelNome.split(' ')[0]
              )}`}</span>
            ) : (
              ''
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, position: 'relative' }}>
          <button
            type="button"
            className="btn btn--icon"
            onClick={() => onRegistrar(paciente)}
            aria-label={`Registrar controles de ${paciente.nome}`}
            title="Registrar controles"
          >
            ✚
          </button>
          <button
            ref={refAcoes}
            type="button"
            className="btn btn--icon"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label={`Mais ações para ${paciente.nome}`}
            aria-expanded={menuAberto}
            title="Mais ações"
          >
            ⋯
          </button>

          {menuAberto && (
            <>
              <div
                role="presentation"
                onClick={() => setMenuAberto(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 70 }}
              />
              <div
                ref={refMenu}
                role="menu"
                style={{
                  ...estiloPainel(posMenu, 222),
                  padding: 5,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <ItemMenu
                  onClick={() => {
                    setMenuAberto(false);
                    onAnamnese(paciente);
                  }}
                >
                  Anamnese
                </ItemMenu>
                <ItemMenu
                  onClick={() => {
                    setMenuAberto(false);
                    onEditar(paciente);
                  }}
                >
                  Editar dados e leito
                </ItemMenu>
                <ItemMenu
                  onClick={() => {
                    setMenuAberto(false);
                    onRegistrar(paciente);
                  }}
                >
                  Registrar controles
                </ItemMenu>
                <ItemMenu
                  onClick={() => {
                    setMenuAberto(false);
                    onExames(paciente);
                  }}
                >
                  Exames e programações
                </ItemMenu>
                <ItemMenu
                  onClick={() => {
                    setMenuAberto(false);
                    onMedicacoes(paciente);
                  }}
                >
                  Medicações em uso
                </ItemMenu>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 2px' }} />
                <ItemMenu
                  destaque
                  onClick={() => {
                    setMenuAberto(false);
                    onEncerrar(paciente);
                  }}
                >
                  Encerrar atendimento…
                </ItemMenu>
              </div>
            </>
          )}
        </div>
      </div>

      {/* NÍVEL 2 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px dashed var(--border)',
        }}
      >
        <div style={{ flex: '2 1 420px', minWidth: 0 }}>
          <Rotulo>Controles {ultimo ? `· ${horaHM(ultimo.horario)}` : ''}</Rotulo>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {vitais.length === 0 && <Vazio>Nenhum controle registrado</Vazio>}
            {vitais.map((v) => (
              <span
                key={v.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: v.alerta ? 'var(--alert-soft)' : 'var(--tag-bg)',
                  border: `1px solid ${v.alerta ? 'var(--color-late)' : 'var(--border)'}`,
                  fontSize: 11.5,
                }}
              >
                <span style={{ color: v.alerta ? 'var(--alert-text)' : 'var(--text-dim)', fontWeight: 600 }}>
                  {v.label}
                </span>
                <span style={{ color: v.alerta ? 'var(--alert-text)' : 'var(--text)', fontWeight: 700 }}>
                  {v.valor}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div style={{ flex: '1 1 230px', minWidth: 0 }}>
          <Rotulo>Medicações em curso</Rotulo>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {meds.length === 0 && <Vazio>Nenhuma</Vazio>}
            {meds.map((m) => {
              const vencida =
                m.proximaDose != null && new Date(m.proximaDose).getTime() < Date.now();
              const temTrilha = m.intervaloMin != null && m.inicio != null;
              return (
                <div
                  key={m.id}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: vencida ? 'var(--alert-soft)' : 'var(--tag-bg)',
                    border: `1px solid ${vencida ? 'var(--color-late)' : 'var(--border)'}`,
                  }}
                >
                  <TituloMedicacao med={m} />
                  {temTrilha ? (
                    <div style={{ marginTop: 4 }}>
                      <TrilhaDoses med={m} max={4} tamanho="compacto" />
                    </div>
                  ) : (
                    <span
                      style={{
                        display: 'block',
                        color: 'var(--text-dim)',
                        fontSize: 10.5,
                        marginTop: 2,
                      }}
                    >
                      contínua{m.inicio ? ` desde ${horaHM(m.inicio)}` : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: '1 1 250px', minWidth: 0 }}>
          <Rotulo>Exames e programações</Rotulo>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {exames.length === 0 && <Vazio>Nenhum</Vazio>}
            {exames.map((e) => (
              <label
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 11.5,
                  cursor: 'pointer',
                  minHeight: 20,
                }}
              >
                <input
                  type="checkbox"
                  checked={e.realizado}
                  onChange={() => alternarExame(e)}
                  style={{ width: 15, height: 15, accentColor: 'var(--color-plum-700)', flex: '0 0 15px', margin: 0 }}
                />
                <span
                  style={{
                    color: e.realizado ? 'var(--text-dim)' : 'var(--text)',
                    textDecoration: e.realizado ? 'line-through' : 'none',
                  }}
                >
                  {e.texto}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontWeight: 700,
                    color: e.realizado ? 'var(--text-dim)' : 'var(--color-plum-600)',
                  }}
                >
                  {e.realizado
                    ? `${e.realizadoEm ? horaHM(e.realizadoEm) : (e.horarioProgramado ?? '')} ✓`
                    : e.ultimaRealizacaoEm
                      ? `últ. ${horaHM(e.ultimaRealizacaoEm)}`
                      : (e.horarioProgramado ?? '')}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function ItemMenu({
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
      role="menuitem"
      onClick={onClick}
      style={{
        border: 0,
        background: 'transparent',
        textAlign: 'left',
        padding: '9px 10px',
        minHeight: 38,
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

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: 'var(--text-dim)',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 5,
      }}
    >
      {children}
    </div>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>{children}</span>;
}

export function formatarIntervalo(min: number): string {
  return min % 60 === 0 ? `${min / 60}h` : `${min} min`;
}

/** Os chips de sinais vitais da última aferição, já marcados com alerta. */
export function montarVitais(
  paciente: Paciente,
  ultimo: Controle | undefined,
  controles: Controle[]
): Vital[] {
  if (!ultimo) return [];
  const emAlerta = new Set(alertasClinicos(ultimo).map((a) => a.campo));
  const v: Vital[] = [];
  const push = (campo: string, label: string, valor: string | null) => {
    if (valor == null) return;
    v.push({ label, valor, alerta: emAlerta.has(campo) });
  };

  push(
    'pa',
    'PA',
    ultimo.paSistolica != null && ultimo.paDiastolica != null
      ? `${ultimo.paSistolica}/${ultimo.paDiastolica} mmHg`
      : null
  );
  push('fc', 'FC', ultimo.fc != null ? `${ultimo.fc} bpm` : null);
  push('bcf', 'BCF', ultimo.bcf != null ? `${ultimo.bcf} bpm` : null);
  push('fr', 'FR', ultimo.fr != null ? `${ultimo.fr} irpm` : null);
  push(
    'temperatura',
    'Temp',
    ultimo.temperatura != null ? `${formatarNumero(ultimo.temperatura, 1)} °C` : null
  );
  push('spo2', 'SpO₂', ultimo.spo2 != null ? `${ultimo.spo2}%` : null);

  if (ultimo.balanco?.diureseMl != null) {
    const debito = debitoUrinario(
      ultimo.balanco.diureseMl,
      ultimo.horario,
      diureseAnterior(paciente.id, controles, ultimo.horario)
    );
    v.push({
      label: 'Diurese',
      valor: debito
        ? `${ultimo.balanco.diureseMl} mL · ${debito.mlPorHora} mL/h`
        : `${ultimo.balanco.diureseMl} mL`,
      alerta: debito?.alerta ?? false,
    });
  }

  if (ultimo.balanco) {
    const b = calcularBalanco(ultimo.balanco);
    v.push({
      label: 'Balanço',
      valor: `${b.total >= 0 ? '+' : ''}${b.total} mL`,
      alerta: false,
    });
  }

  return v;
}
