import { useState } from 'react';
import type { Paciente } from '../types';
import { useApp } from '../state/store';
import { Modal } from './ui';
import { horaHM } from '../lib/calc';

/** Sugestões do dia a dia, para não digitar o mesmo texto toda vez. */
const SUGESTOES = [
  'Hemograma',
  'Glicemia capilar',
  'USG obstétrica',
  'Cardiotocografia',
  'Tipagem sanguínea',
  'Urocultura',
  'Teste do pezinho (RN)',
  'Checagem de reflexo patelar',
  'PA de 15 em 15 min',
  'Reserva de sangue',
];

export function ModalExames({
  paciente,
  onFechar,
}: {
  paciente: Paciente;
  onFechar(): void;
}) {
  const { estado, adicionarExame, alternarExame, removerExame, repetirExame } = useApp();

  const [texto, setTexto] = useState('');
  const [horario, setHorario] = useState('');

  const leito = estado.leitos.find((l) => l.id === paciente.leitoId);
  const exames = estado.exames
    .filter((e) => e.pacienteId === paciente.id)
    .sort((a, b) => {
      if (a.realizado !== b.realizado) return a.realizado ? 1 : -1;
      return (a.horarioProgramado ?? '99:99').localeCompare(b.horarioProgramado ?? '99:99');
    });

  const adicionar = () => {
    if (!texto.trim()) return;
    adicionarExame(paciente.id, texto, horario);
    setTexto('');
    setHorario('');
  };

  const pendentes = exames.filter((e) => !e.realizado).length;

  return (
    <Modal
      titulo="Exames e programações"
      largura={720}
      onFechar={onFechar}
      subtitulo={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 24,
              padding: '0 9px',
              borderRadius: 7,
              background: 'var(--color-plum-800)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            Leito {leito?.nome ?? '—'}
          </span>
          <span style={{ color: 'var(--color-plum-100)', fontWeight: 600, fontSize: 13.5 }}>
            {paciente.nome}
          </span>
          <span style={{ color: 'var(--color-plum-300)', fontSize: 12 }}>
            {pendentes} pendente{pendentes === 1 ? '' : 's'}
          </span>
        </div>
      }
      rodape={
        <div style={{ marginLeft: 'auto' }}>
          <button type="button" className="btn btn--primary" onClick={onFechar}>
            Concluído
          </button>
        </div>
      }
    >
      {/* ACRESCENTAR */}
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="sec">Acrescentar</legend>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <label className="lbl" htmlFor="novo-exame-texto">
              Exame ou programação
            </label>
            <div className="field">
              <input
                id="novo-exame-texto"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') adicionar();
                }}
                placeholder="Ex.: Hemograma, corticoide 2.ª dose"
                list="sugestoes-exames"
                autoFocus
              />
            </div>
            <datalist id="sugestoes-exames">
              {SUGESTOES.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </div>
          <div style={{ flex: '0 0 130px' }}>
            <label className="lbl" htmlFor="novo-exame-hora">
              Horário
            </label>
            <div className="field">
              <input
                id="novo-exame-hora"
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            style={{ height: 38 }}
            onClick={adicionar}
            disabled={!texto.trim()}
          >
            ✚ Adicionar
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
          {SUGESTOES.slice(0, 6).map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setTexto(x)}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 20,
                background: 'transparent',
                color: 'var(--text-dim)',
                fontSize: 11.5,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              {x}
            </button>
          ))}
        </div>
      </fieldset>

      {/* LISTA */}
      <div>
        <h3 className="sec">Da paciente</h3>
        {exames.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 12.5 }}>
            Nenhum exame ou programação registrado.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {exames.map((e) => (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 2px',
                  borderBottom: '1px solid var(--border)',
                  minHeight: 44,
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flex: '1 1 auto',
                    minWidth: 0,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={e.realizado}
                    onChange={() => alternarExame(e)}
                    style={{
                      width: 17,
                      height: 17,
                      accentColor: 'var(--color-plum-700)',
                      flex: '0 0 17px',
                      margin: 0,
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 13,
                        color: e.realizado ? 'var(--text-dim)' : 'var(--text)',
                        textDecoration: e.realizado ? 'line-through' : 'none',
                      }}
                    >
                      {e.texto}
                    </span>
                    {e.realizado && e.realizadoPor && (
                      <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: 11 }}>
                        realizado por {e.realizadoPor}
                        {e.realizadoEm ? ` às ${horaHM(e.realizadoEm)}` : ''}
                      </span>
                    )}
                    {!e.realizado && e.ultimaRealizacaoEm && (
                      <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: 11 }}>
                        última às {horaHM(e.ultimaRealizacaoEm)}
                        {e.ultimaRealizacaoPor ? ` por ${e.ultimaRealizacaoPor}` : ''}
                      </span>
                    )}
                  </span>
                </label>

                <span
                  style={{
                    flex: '0 0 auto',
                    fontWeight: 700,
                    fontSize: 12.5,
                    color: e.realizado ? 'var(--text-dim)' : 'var(--color-plum-600)',
                  }}
                >
                  {e.horarioProgramado ?? '—'}
                </span>

                {e.realizado && (
                  <button
                    type="button"
                    className="btn"
                    style={{ flex: '0 0 auto', height: 32, padding: '0 10px', fontSize: 11.5 }}
                    onClick={() => repetirExame(e)}
                    title="Voltar para pendente, guardando o horário desta realização"
                  >
                    Repetir
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--icon"
                  style={{ flex: '0 0 32px', width: 32, height: 32 }}
                  onClick={() => removerExame(e)}
                  aria-label={`Remover ${e.texto}`}
                  title="Remover"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <p style={{ margin: '10px 0 0', color: 'var(--text-dim)', fontSize: 11.5 }}>
          Marcar como realizado grava quem marcou e o horário. <strong>Repetir</strong>
          devolve o item para pendente guardando o horário da última realização — é o que
          serve para cardiotocografia, glicemia e outros controles que se repetem no
          plantão. Remover tira o item da lista e fica no histórico de alterações.
        </p>
      </div>
    </Modal>
  );
}
