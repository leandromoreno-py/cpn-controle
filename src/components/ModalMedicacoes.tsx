import { useState } from 'react';
import type { Medicacao, Paciente } from '../types';
import { useApp } from '../state/store';
import { Campo, Modal, Unidade } from './ui';
import { horaHM, isoComHora } from '../lib/calc';

const num = (v: string): number | undefined =>
  v.trim() === '' ? undefined : Number(v.replace(',', '.'));

/** Atalhos do dia a dia do centro de parto. */
const ATALHOS: {
  nome: string;
  dose?: string;
  via?: string;
  vazaoMlH?: number;
  intervaloMin?: number;
  observacao?: string;
}[] = [
  { nome: 'Ocitocina', via: 'EV em bomba', vazaoMlH: 12 },
  {
    nome: 'Sulfato de magnésio',
    dose: '1 g/h (manutenção)',
    via: 'EV em bomba',
    observacao: 'Checar reflexo patelar, FR e diurese a cada hora.',
  },
  { nome: 'Ampicilina', dose: '2 g', via: 'EV', intervaloMin: 360 },
  { nome: 'Dipirona', dose: '1 g', via: 'EV', intervaloMin: 360 },
  { nome: 'Betametasona', dose: '12 mg', via: 'IM', intervaloMin: 1440 },
  { nome: 'Misoprostol', dose: '400 mcg', via: 'Sublingual', intervaloMin: 240 },
];

const INTERVALOS: { label: string; min?: number }[] = [
  { label: 'Contínua / sem intervalo' },
  { label: '4 em 4 h', min: 240 },
  { label: '6 em 6 h', min: 360 },
  { label: '8 em 8 h', min: 480 },
  { label: '12 em 12 h', min: 720 },
  { label: '24 em 24 h', min: 1440 },
];

const STATUS_LABEL: Record<Medicacao['status'], string> = {
  em_curso: 'Em curso',
  suspensa: 'Suspensa',
  concluida: 'Concluída',
};

export function ModalMedicacoes({
  paciente,
  onFechar,
}: {
  paciente: Paciente;
  onFechar(): void;
}) {
  const {
    estado,
    adicionarMedicacao,
    atualizarMedicacao,
    registrarDose,
    removerMedicacao,
  } = useApp();

  const [nome, setNome] = useState('');
  const [dose, setDose] = useState('');
  const [via, setVia] = useState('');
  const [vazao, setVazao] = useState('');
  const [intervalo, setIntervalo] = useState<number | undefined>(undefined);
  const [inicio, setInicio] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
  const [observacao, setObservacao] = useState('');

  const leito = estado.leitos.find((l) => l.id === paciente.leitoId);
  const medicacoes = estado.medicacoes.filter((m) => m.pacienteId === paciente.id);
  const emCurso = medicacoes.filter((m) => m.status === 'em_curso');
  const encerradas = medicacoes.filter((m) => m.status !== 'em_curso');

  const aplicarAtalho = (a: (typeof ATALHOS)[number]) => {
    setNome(a.nome);
    setDose(a.dose ?? '');
    setVia(a.via ?? '');
    setVazao(a.vazaoMlH != null ? String(a.vazaoMlH) : '');
    setIntervalo(a.intervaloMin);
    setObservacao(a.observacao ?? '');
  };

  const adicionar = () => {
    if (!nome.trim()) return;
    const inicioIso = isoComHora(inicio);
    adicionarMedicacao({
      pacienteId: paciente.id,
      nome: nome.trim(),
      dose: dose.trim() || undefined,
      via: via.trim() || undefined,
      vazaoMlH: num(vazao),
      inicio: inicioIso,
      intervaloMin: intervalo,
      proximaDose: intervalo
        ? new Date(new Date(inicioIso).getTime() + intervalo * 60_000).toISOString()
        : undefined,
      observacao: observacao.trim() || undefined,
      status: 'em_curso',
    });
    setNome('');
    setDose('');
    setVia('');
    setVazao('');
    setIntervalo(undefined);
    setObservacao('');
  };

  return (
    <Modal
      titulo="Medicações em uso"
      largura={800}
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
            {emCurso.length} em curso
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {ATALHOS.map((a) => (
            <button
              key={a.nome}
              type="button"
              onClick={() => aplicarAtalho(a)}
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
              {a.nome}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <Campo label="Medicação" span={2}>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') adicionar();
              }}
              placeholder="Nome da medicação"
              aria-label="Nome da medicação"
            />
          </Campo>
          <Campo label="Dose">
            <input
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="2 g"
              aria-label="Dose"
            />
          </Campo>
          <Campo label="Via">
            <input
              value={via}
              onChange={(e) => setVia(e.target.value)}
              placeholder="EV, IM, VO"
              aria-label="Via"
            />
          </Campo>
          <Campo label="Vazão">
            <input
              inputMode="numeric"
              value={vazao}
              onChange={(e) => setVazao(e.target.value)}
              aria-label="Vazão"
            />
            <Unidade>mL/h</Unidade>
          </Campo>
          <Campo label="Início">
            <input
              type="time"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              aria-label="Horário de início"
            />
          </Campo>
          <Campo label="Intervalo" span={2}>
            <select
              value={intervalo ?? ''}
              onChange={(e) => setIntervalo(e.target.value ? Number(e.target.value) : undefined)}
              aria-label="Intervalo entre doses"
            >
              {INTERVALOS.map((i) => (
                <option key={i.label} value={i.min ?? ''}>
                  {i.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Observação" span={3}>
            <input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Opcional — checagens, cuidados"
              aria-label="Observação"
            />
          </Campo>
          <button
            type="button"
            className="btn btn--primary"
            style={{ height: 38 }}
            onClick={adicionar}
            disabled={!nome.trim()}
          >
            ✚ Adicionar
          </button>
        </div>
      </fieldset>

      {/* EM CURSO */}
      <div>
        <h3 className="sec">Em curso</h3>
        {emCurso.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 12.5 }}>
            Nenhuma medicação em curso.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {emCurso.map((m) => (
              <Linha
                key={m.id}
                med={m}
                onAtualizar={atualizarMedicacao}
                onDose={registrarDose}
                onRemover={removerMedicacao}
              />
            ))}
          </div>
        )}
      </div>

      {encerradas.length > 0 && (
        <div>
          <h3 className="sec">Suspensas e concluídas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {encerradas.map((m) => (
              <Linha
                key={m.id}
                med={m}
                onAtualizar={atualizarMedicacao}
                onDose={registrarDose}
                onRemover={removerMedicacao}
              />
            ))}
          </div>
        </div>
      )}

      <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 11.5 }}>
        <strong>Dose agora</strong> grava o horário e recalcula a próxima pelo intervalo. A
        medicação com próxima dose vencida aparece em laranja na linha do quadro.
      </p>
    </Modal>
  );
}

function Linha({
  med,
  onAtualizar,
  onDose,
  onRemover,
}: {
  med: Medicacao;
  onAtualizar(id: string, mudancas: Partial<Medicacao>, campo?: string): void;
  onDose(m: Medicacao): void;
  onRemover(m: Medicacao): void;
}) {
  const [editando, setEditando] = useState(false);
  const vencida = med.proximaDose != null && new Date(med.proximaDose).getTime() < Date.now();
  const ativa = med.status === 'em_curso';

  return (
    <div
      style={{
        border: `1px solid ${vencida && ativa ? 'var(--color-late)' : 'var(--border)'}`,
        borderRadius: 10,
        background: vencida && ativa ? 'var(--alert-soft)' : 'var(--app-bg)',
        padding: '10px 12px',
        opacity: ativa ? 1 : 0.7,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ flex: '1 1 200px', minWidth: 0 }}>
          <strong style={{ fontSize: 13.5 }}>{med.nome}</strong>
          <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: 11.5 }}>
            {[
              med.dose,
              med.via,
              med.vazaoMlH != null ? `${med.vazaoMlH} mL/h` : null,
              med.inicio ? `início ${horaHM(med.inicio)}` : null,
              med.ultimaDoseEm ? `últ. dose ${horaHM(med.ultimaDoseEm)}` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'sem detalhes'}
          </span>
          {med.observacao && (
            <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: 11 }}>
              {med.observacao}
            </span>
          )}
        </span>

        {med.proximaDose && (
          <span
            style={{
              flex: '0 0 auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 26,
              padding: '0 9px',
              borderRadius: 7,
              border: `1px solid ${vencida && ativa ? 'var(--color-late)' : 'var(--border)'}`,
              color: vencida && ativa ? 'var(--alert-text)' : 'var(--text)',
              background: 'var(--surface)',
              fontSize: 11.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {vencida && ativa ? '⚠ ' : ''}próx. {horaHM(med.proximaDose)}
          </span>
        )}

        <div className="field" style={{ flex: '0 0 136px', height: 32 }}>
          <label className="sr-only" htmlFor={`status-${med.id}`}>
            Status de {med.nome}
          </label>
          <select
            id={`status-${med.id}`}
            value={med.status}
            onChange={(e) =>
              onAtualizar(med.id, { status: e.target.value as Medicacao['status'] }, 'status')
            }
          >
            {(Object.keys(STATUS_LABEL) as Medicacao['status'][]).map((st) => (
              <option key={st} value={st}>
                {STATUS_LABEL[st]}
              </option>
            ))}
          </select>
        </div>

        {ativa && (
          <button
            type="button"
            className="btn"
            style={{ flex: '0 0 auto', height: 32, padding: '0 10px', fontSize: 11.5 }}
            onClick={() => onDose(med)}
            title="Registra o horário e recalcula a próxima dose"
          >
            Dose agora
          </button>
        )}
        <button
          type="button"
          className="btn"
          style={{ flex: '0 0 auto', height: 32, padding: '0 10px', fontSize: 11.5 }}
          onClick={() => setEditando((v) => !v)}
          aria-expanded={editando}
        >
          {editando ? 'Fechar' : 'Editar'}
        </button>
        <button
          type="button"
          className="btn btn--icon"
          style={{ flex: '0 0 32px', width: 32, height: 32 }}
          onClick={() => onRemover(med)}
          aria-label={`Remover ${med.nome}`}
          title="Remover"
        >
          ✕
        </button>
      </div>

      {editando && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 10,
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px dashed var(--border)',
            alignItems: 'end',
          }}
        >
          <Campo label="Dose">
            <input
              value={med.dose ?? ''}
              onChange={(e) => onAtualizar(med.id, { dose: e.target.value }, 'dose')}
              aria-label="Dose"
            />
          </Campo>
          <Campo label="Via">
            <input
              value={med.via ?? ''}
              onChange={(e) => onAtualizar(med.id, { via: e.target.value }, 'via')}
              aria-label="Via"
            />
          </Campo>
          <Campo label="Vazão">
            <input
              inputMode="numeric"
              value={med.vazaoMlH ?? ''}
              onChange={(e) =>
                onAtualizar(med.id, { vazaoMlH: num(e.target.value) }, 'vazão')
              }
              aria-label="Vazão"
            />
            <Unidade>mL/h</Unidade>
          </Campo>
          <Campo label="Próxima dose">
            <input
              type="time"
              value={med.proximaDose ? horaHM(med.proximaDose) : ''}
              onChange={(e) =>
                onAtualizar(
                  med.id,
                  { proximaDose: e.target.value ? isoComHora(e.target.value) : undefined },
                  'próxima dose'
                )
              }
              aria-label="Próxima dose"
            />
          </Campo>
          <Campo label="Observação" span={4}>
            <input
              value={med.observacao ?? ''}
              onChange={(e) => onAtualizar(med.id, { observacao: e.target.value }, 'observação')}
              aria-label="Observação"
            />
          </Campo>
        </div>
      )}
    </div>
  );
}
