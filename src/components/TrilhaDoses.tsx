import type { Medicacao } from '../types';
import { horaHM, recortarSerie, serieDoses, type Dose } from '../lib/calc';

/**
 * A sequência de doses de uma medicação, em chips numerados.
 *
 * Feita → check e verde. Próxima → destacada, laranja quando já passou da hora.
 * Futuras → discretas. Cada estado tem cor E símbolo: num posto de enfermagem,
 * a cor sozinha não pode ser o que distingue uma dose dada de uma pendente.
 */
export function TrilhaDoses({
  med,
  max = 4,
  tamanho = 'normal',
}: {
  med: Medicacao;
  max?: number;
  tamanho?: 'normal' | 'compacto';
}) {
  const doses = serieDoses(med);
  if (doses.length === 0) return null;

  const { visiveis, cortado } = recortarSerie(doses, max);
  const fonte = tamanho === 'compacto' ? 10.5 : 11.5;
  const altura = tamanho === 'compacto' ? 20 : 24;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
      {cortado > 0 && (
        <span
          style={{ color: 'var(--text-dim)', fontSize: fonte }}
          title={`${cortado} dose(s) anterior(es)`}
        >
          +{cortado} ·
        </span>
      )}
      {visiveis.map((d) => (
        <ChipDose key={d.ordinal} dose={d} fonte={fonte} altura={altura} />
      ))}
    </div>
  );
}

function ChipDose({ dose, fonte, altura }: { dose: Dose; fonte: number; altura: number }) {
  const estilo = dose.feita
    ? {
        borda: 'var(--color-ok)',
        fundo: 'rgba(5,150,105,0.10)',
        cor: 'var(--ok-text)',
        simbolo: '✓',
        titulo: `${dose.ordinal}ª dose administrada às ${horaHM(dose.horario)}`,
      }
    : dose.atrasada
      ? {
          borda: 'var(--color-late)',
          fundo: 'var(--alert-soft)',
          cor: 'var(--alert-text)',
          simbolo: '⚠',
          titulo: `${dose.ordinal}ª dose atrasada — estava prevista para ${horaHM(dose.horario)}`,
        }
      : dose.proxima
        ? {
            borda: 'var(--color-warn)',
            fundo: 'rgba(232,163,60,0.12)',
            cor: 'var(--warn-text)',
            simbolo: '→',
            titulo: `${dose.ordinal}ª dose prevista para ${horaHM(dose.horario)}`,
          }
        : {
            borda: 'var(--border)',
            fundo: 'transparent',
            cor: 'var(--text-dim)',
            simbolo: '',
            titulo: `${dose.ordinal}ª dose prevista para ${horaHM(dose.horario)}`,
          };

  return (
    <span
      title={estilo.titulo}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: altura,
        padding: '0 7px',
        borderRadius: 6,
        border: `1px solid ${estilo.borda}`,
        background: estilo.fundo,
        color: estilo.cor,
        fontSize: fonte,
        fontWeight: dose.feita || dose.proxima ? 700 : 500,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ opacity: 0.85 }}>{dose.ordinal}ª</span>
      {horaHM(dose.horario)}
      {estilo.simbolo && <span aria-hidden="true">{estilo.simbolo}</span>}
      <span className="sr-only">
        {dose.feita
          ? 'administrada'
          : dose.atrasada
            ? 'atrasada'
            : dose.proxima
              ? 'próxima'
              : 'prevista'}
      </span>
    </span>
  );
}

/** Nome e apresentação da medicação, para encabeçar a trilha. */
export function TituloMedicacao({ med, fonte = 11.5 }: { med: Medicacao; fonte?: number }) {
  const detalhe = [med.dose, med.vazaoMlH != null ? `${med.vazaoMlH} mL/h` : null, med.via]
    .filter(Boolean)
    .join(' · ');
  return (
    <span style={{ fontSize: fonte }}>
      <strong>{med.nome}</strong>
      {detalhe && <span style={{ color: 'var(--text-dim)' }}> {detalhe}</span>}
    </span>
  );
}
