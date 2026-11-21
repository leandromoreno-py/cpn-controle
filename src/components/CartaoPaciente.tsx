import { useMemo, useState } from 'react';
import type { Paciente } from '../types';
import { DU_LABEL, STATUS_LABEL } from '../types';
import { useApp } from '../state/store';
import { MenuLeito } from './MenuLeito';
import { estiloCategoria } from '../lib/contrast';
import {
  controlesDe,
  horaHM,
  idadeGestacional,
  paridade,
  situacaoControle,
} from '../lib/calc';
import { formatarIntervalo, montarVitais } from './LinhaPaciente';

/**
 * A mesma paciente, empilhada para tela estreita.
 *
 * O quadro de dois níveis precisa de ~1000 px; num celular ele só caberia com
 * rolagem horizontal, que é intolerável para conferir sinal vital. Aqui a
 * informação é a mesma, em blocos que descem.
 */
export function CartaoPaciente({
  paciente,
  onRegistrar,
  onAnamnese,
  onEditar,
  onEncerrar,
}: {
  paciente: Paciente;
  onRegistrar(p: Paciente): void;
  onAnamnese(p: Paciente): void;
  onEditar(p: Paciente): void;
  onEncerrar(p: Paciente): void;
}) {
  const { estado, tema, alternarExame } = useApp();
  const [leitoAberto, setLeitoAberto] = useState(false);
  const [expandido, setExpandido] = useState(false);

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
  const pendentes = exames.filter((e) => !e.realizado);
  const vitais = montarVitais(paciente, ultimo, estado.controles);
  const toqueRecente = controlesDe(paciente.id, estado.controles).find(
    (c) => c.toque?.dilatacaoCm != null
  );

  const cor =
    situacao.estado === 'atrasado'
      ? { bg: 'var(--alert-soft)', borda: 'var(--color-late)', texto: 'var(--alert-text)' }
      : situacao.estado === 'vencendo'
        ? { bg: 'rgba(232,163,60,0.12)', borda: 'var(--color-warn)', texto: 'var(--warn-text)' }
        : { bg: 'rgba(5,150,105,0.10)', borda: 'var(--color-ok)', texto: 'var(--ok-text)' };

  return (
    <article
      className="card"
      style={{
        borderLeft: `5px solid ${estilo.barra}`,
        background: estilo.linhaBg,
        padding: 13,
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
      }}
    >
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ position: 'relative', flex: '0 0 auto' }}>
          <button
            type="button"
            onClick={() => setLeitoAberto((v) => !v)}
            aria-expanded={leitoAberto}
            aria-label={`Editar o leito ${leito?.nome ?? 'sem leito'} de ${paciente.nome}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              minWidth: 52,
              height: 44,
              padding: '0 10px',
              borderRadius: 9,
              background: estilo.chipBg,
              border: `1px solid ${estilo.barra}`,
              color: estilo.texto,
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {leito?.nome ?? '—'}
            {paciente.anamnese?.trim() ? (
              <span aria-hidden="true" style={{ fontSize: 10, opacity: 0.75 }}>
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
              onFechar={() => setLeitoAberto(false)}
              onAnamnese={onAnamnese}
              onEditar={onEditar}
              onEncerrar={onEncerrar}
            />
          )}
        </div>

        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => onEditar(paciente)}
            style={{
              border: 0,
              background: 'transparent',
              padding: 0,
              textAlign: 'left',
              color: 'var(--text)',
              fontWeight: 700,
              fontSize: 14.5,
              cursor: 'pointer',
              lineHeight: 1.25,
            }}
          >
            {paciente.nome}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 20,
                padding: '0 8px',
                borderRadius: 20,
                background: estilo.chipBg,
                color: estilo.texto,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {categoria?.nome}
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>
              {paciente.idade != null ? `${paciente.idade} anos · ` : ''}
              {STATUS_LABEL[paciente.status]}
            </span>
          </div>
        </div>

        <span
          className={situacao.estado === 'atrasado' ? 'pulse' : undefined}
          style={{
            flex: '0 0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            height: 26,
            padding: '0 9px',
            borderRadius: 7,
            background: cor.bg,
            border: `1px solid ${cor.borda}`,
            color: cor.texto,
            fontSize: 11.5,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {situacao.estado === 'atrasado' && <span aria-hidden="true">⚠</span>}
          {situacao.label}
        </span>
      </div>

      {/* IDENTIFICAÇÃO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
          paddingTop: 10,
          borderTop: '1px dashed var(--border)',
        }}
      >
        <Dado rotulo="Paridade">{paridade(paciente)}</Dado>
        <Dado rotulo="IG">{idadeGestacional(paciente)}</Dado>
        <Dado rotulo="Meta">{formatarIntervalo(paciente.intervaloControleMin)}</Dado>
        <Dado rotulo="Dilatação">
          {toqueRecente?.toque?.dilatacaoCm != null ? `${toqueRecente.toque.dilatacaoCm} cm` : '—'}
        </Dado>
        <div style={{ gridColumn: 'span 2' }}>
          <Dado rotulo="Dinâmica uterina">
            {paciente.dinamicaUterina ? DU_LABEL[paciente.dinamicaUterina] : 'não avaliada'}
          </Dado>
        </div>
      </div>

      {paciente.comorbidades.length > 0 && (
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
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* CONTROLES */}
      <div>
        <Rotulo>Controles {ultimo ? `· ${horaHM(ultimo.horario)}` : ''}</Rotulo>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {vitais.length === 0 && (
            <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>
              Nenhum controle registrado
            </span>
          )}
          {vitais.map((v) => (
            <span
              key={v.label}
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 4,
                padding: '4px 9px',
                borderRadius: 6,
                background: v.alerta ? 'var(--alert-soft)' : 'var(--tag-bg)',
                border: `1px solid ${v.alerta ? 'var(--color-late)' : 'var(--border)'}`,
                fontSize: 12,
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

      {/* RESUMO DO QUE FALTA, SEMPRE VISÍVEL */}
      {(meds.length > 0 || pendentes.length > 0) && !expandido && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {meds.slice(0, 2).map((m) => (
            <span
              key={m.id}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                background: 'var(--tag-bg)',
                border: '1px solid var(--border)',
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              {m.nome}
              {m.vazaoMlH != null ? ` ${m.vazaoMlH} mL/h` : ''}
            </span>
          ))}
          {pendentes.length > 0 && (
            <span style={{ color: 'var(--text-dim)', fontSize: 11.5, alignSelf: 'center' }}>
              {pendentes.length} pendência{pendentes.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {expandido && (
        <>
          <div>
            <Rotulo>Medicações em curso</Rotulo>
            {meds.length === 0 ? (
              <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>Nenhuma</span>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {meds.map((m) => {
                  const vencida =
                    m.proximaDose != null && new Date(m.proximaDose).getTime() < Date.now();
                  return (
                    <span
                      key={m.id}
                      style={{
                        padding: '4px 9px',
                        borderRadius: 6,
                        background: vencida ? 'var(--alert-soft)' : 'var(--tag-bg)',
                        border: `1px solid ${vencida ? 'var(--color-late)' : 'var(--border)'}`,
                        color: vencida ? 'var(--alert-text)' : 'var(--text)',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {vencida ? '⚠ ' : ''}
                      {m.nome}
                      {m.vazaoMlH != null ? ` ${m.vazaoMlH} mL/h` : m.dose ? ` ${m.dose}` : ''}
                      {m.proximaDose ? ` · próx. ${horaHM(m.proximaDose)}` : ''}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Rotulo>Exames e programações</Rotulo>
            {exames.length === 0 ? (
              <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>Nenhum</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {exames.map((e) => (
                  <label
                    key={e.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      fontSize: 12.5,
                      cursor: 'pointer',
                      minHeight: 36,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={e.realizado}
                      onChange={() => alternarExame(e)}
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: 'var(--color-plum-700)',
                        flex: '0 0 18px',
                        margin: 0,
                      }}
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
                      {e.horarioProgramado ?? ''}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* AÇÕES */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn btn--primary"
          style={{ flex: '1 1 auto', height: 44 }}
          onClick={() => onRegistrar(paciente)}
        >
          ✚ Registrar controles
        </button>
        <button
          type="button"
          className="btn"
          style={{ flex: '0 0 auto', height: 44, padding: '0 14px' }}
          onClick={() => setExpandido((v) => !v)}
          aria-expanded={expandido}
        >
          {expandido ? 'Menos' : 'Mais'}
        </button>
      </div>
    </article>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          color: 'var(--text-dim)',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {rotulo}
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{children}</div>
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
        marginBottom: 5,
      }}
    >
      {children}
    </div>
  );
}
