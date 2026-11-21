import { useState } from 'react';
import type { Paciente } from '../types';
import { STATUS_LABEL } from '../types';
import { useApp } from '../state/store';
import { Modal } from './ui';
import { horaHM, idadeGestacional, paridade } from '../lib/calc';

/**
 * Anamnese: a descrição do caso em texto livre. Abre pelo chip do leito, que é
 * o alvo mais rápido de acertar no quadro.
 */
export function ModalAnamnese({
  paciente,
  onFechar,
  onEditarDados,
}: {
  paciente: Paciente;
  onFechar(): void;
  onEditarDados(p: Paciente): void;
}) {
  const { estado, salvarAnamnese, usuarioAtual } = useApp();
  const [texto, setTexto] = useState(paciente.anamnese ?? '');

  const leito = estado.leitos.find((l) => l.id === paciente.leitoId);
  const categoria = estado.categorias.find((c) => c.id === paciente.categoriaId);
  const alterado = texto !== (paciente.anamnese ?? '');

  const registros = estado.auditoria
    .filter((a) => a.pacienteId === paciente.id && a.acao === 'anamnese')
    .slice(0, 3);

  const salvar = () => {
    salvarAnamnese(paciente.id, texto);
    onFechar();
  };

  return (
    <Modal
      titulo={`Anamnese — Leito ${leito?.nome ?? '—'}`}
      largura={760}
      onFechar={onFechar}
      subtitulo={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--color-plum-100)', fontWeight: 600, fontSize: 13.5 }}>
            {paciente.nome}
          </span>
          <span style={{ color: 'var(--color-plum-300)', fontSize: 12 }}>
            {paciente.idade != null ? `${paciente.idade} anos · ` : ''}
            {paridade(paciente)} · {idadeGestacional(paciente)} ·{' '}
            {STATUS_LABEL[paciente.status]}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 21,
              padding: '0 9px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.16)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {categoria?.nome}
          </span>
        </div>
      }
      rodape={
        <>
          <div
            style={{
              flex: '1 1 240px',
              minWidth: 0,
              color: 'var(--text-dim)',
              fontSize: 11.5,
              lineHeight: 1.5,
            }}
          >
            Salvo com seu nome e horário no histórico de alterações.
          </div>
          <div style={{ flex: '0 0 auto', display: 'flex', gap: 9 }}>
            <button type="button" className="btn" onClick={() => onEditarDados(paciente)}>
              Editar dados da paciente
            </button>
            <button type="button" className="btn" onClick={onFechar}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" onClick={salvar} disabled={!alterado}>
              Salvar anamnese
            </button>
          </div>
        </>
      }
    >
      {paciente.comorbidades.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {paciente.comorbidades.map((c) => (
            <span
              key={c}
              style={{
                padding: '3px 9px',
                borderRadius: 6,
                background: 'var(--tag-bg)',
                border: '1px solid var(--border)',
                fontSize: 11.5,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <div>
        <label className="lbl" htmlFor="anamnese">
          Descrição do caso
        </label>
        <textarea
          id="anamnese"
          rows={16}
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={
            'História da gestação e da admissão, antecedentes, pré-natal, queixas, ' +
            'exame físico, condutas e orientações.'
          }
          style={{
            width: '100%',
            border: '1px solid var(--border)',
            borderRadius: 9,
            padding: '12px 13px',
            background: 'var(--surface)',
            color: 'var(--text)',
            resize: 'vertical',
            outline: 0,
            lineHeight: 1.6,
            fontSize: 13.5,
          }}
        />
        <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: 11.5 }}>
          {texto.trim().length} caracteres
          {paciente.atualizadoPor ? ` · último toque por ${paciente.atualizadoPor}` : ''}
        </p>
      </div>

      {registros.length > 0 && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 12,
            color: 'var(--text-dim)',
            fontSize: 11.5,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 3 }}>
            Edições anteriores da anamnese
          </strong>
          {registros.map((a) => (
            <div key={a.id}>
              {a.usuarioNome} · {horaHM(a.timestamp)}
            </div>
          ))}
        </div>
      )}

      <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 11.5 }}>
        Registrando como <strong style={{ color: 'var(--text)' }}>{usuarioAtual.nome}</strong>.
      </p>
    </Modal>
  );
}
