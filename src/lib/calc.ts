// Valores derivados. Nada aqui é digitado pelo usuário: idade gestacional,
// tempo desde o último controle, débito urinário e balanço são sempre calculados.

import type { BalancoHidrico, Controle, Paciente } from '../types';

export const MS_HORA = 3_600_000;

export function agoraIso(): string {
  return new Date().toISOString();
}

export function horaHM(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isoComHora(hm: string, base = new Date()): string {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toISOString();
}

/** "2h15", "45 min" — duração em minutos para leitura rápida. */
export function duracao(min: number): string {
  const abs = Math.max(0, Math.round(min));
  const h = Math.floor(abs / 60);
  const r = abs % 60;
  return h > 0 ? `${h}h${String(r).padStart(2, '0')}` : `${r} min`;
}

export function minutosDesde(iso: string, agora = Date.now()): number {
  return Math.round((agora - new Date(iso).getTime()) / 60_000);
}

/** Idade gestacional no formato XsXd, autoincrementada pela data atual. */
export function idadeGestacional(p: Paciente, agora = new Date()): string {
  if (p.dum) {
    const dias = Math.floor(
      (agora.getTime() - new Date(p.dum).getTime()) / 86_400_000
    );
    if (dias < 0) return '—';
    return `${Math.floor(dias / 7)}s${dias % 7}d`;
  }
  if (p.igAdmissaoSemanas != null && p.igDataReferencia) {
    const base =
      p.igAdmissaoSemanas * 7 + (p.igAdmissaoDias ?? 0);
    const decorridos = Math.floor(
      (agora.getTime() - new Date(p.igDataReferencia).getTime()) / 86_400_000
    );
    const total = base + Math.max(0, decorridos);
    return `${Math.floor(total / 7)}s${total % 7}d`;
  }
  return '—';
}

export function paridade(p: Paciente): string {
  const v = (n?: number) => (n == null ? '?' : n);
  if (p.paridadeG == null && p.paridadeP == null && p.paridadeA == null) {
    return 'G?P?A?';
  }
  return `G${v(p.paridadeG)}P${v(p.paridadeP)}A${v(p.paridadeA)}`;
}

export type EstadoControle = 'em_dia' | 'vencendo' | 'atrasado';

export interface SituacaoControle {
  estado: EstadoControle;
  label: string;
  minutosDesde: number | null;
  ultimo?: Controle;
}

/**
 * Situação do controle de uma paciente.
 * Escala PRÓPRIA, sem vermelho: o vermelho pertence à categoria puérpera.
 */
export function situacaoControle(
  paciente: Paciente,
  controles: Controle[],
  agora = Date.now()
): SituacaoControle {
  const meus = controles
    .filter((c) => c.pacienteId === paciente.id)
    .sort((a, b) => b.horario.localeCompare(a.horario));
  const ultimo = meus[0];
  if (!ultimo) {
    return {
      estado: 'atrasado',
      label: 'sem registro',
      minutosDesde: null,
    };
  }
  const min = minutosDesde(ultimo.horario, agora);
  const meta = paciente.intervaloControleMin;
  if (min > meta) {
    return {
      estado: 'atrasado',
      label: `atrasado ${duracao(min - meta)}`,
      minutosDesde: min,
      ultimo,
    };
  }
  if (meta - min <= 30) {
    return { estado: 'vencendo', label: duracao(min), minutosDesde: min, ultimo };
  }
  return { estado: 'em_dia', label: duracao(min), minutosDesde: min, ultimo };
}

/** Controles de uma paciente, do mais recente para o mais antigo. */
export function controlesDe(pacienteId: string, controles: Controle[]): Controle[] {
  return controles
    .filter((c) => c.pacienteId === pacienteId)
    .sort((a, b) => b.horario.localeCompare(a.horario));
}

export interface DebitoUrinario {
  mlPorHora: number;
  memoria: string;
  alerta: boolean;
}

/** (volume atual − anterior) ÷ horas decorridas. */
export function debitoUrinario(
  volumeAtual: number | undefined,
  horarioAtual: string,
  anterior: { volume: number; horario: string } | undefined
): DebitoUrinario | null {
  if (volumeAtual == null || !anterior) return null;
  const horas =
    (new Date(horarioAtual).getTime() - new Date(anterior.horario).getTime()) /
    MS_HORA;
  if (!(horas > 0)) return null;
  const ml = (volumeAtual - anterior.volume) / horas;
  const mlPorHora = Math.round(ml);
  return {
    mlPorHora,
    memoria: `(${volumeAtual} − ${anterior.volume}) ÷ ${horas
      .toFixed(1)
      .replace('.', ',')} h · anterior ${anterior.volume} mL às ${horaHM(
      anterior.horario
    )}`,
    alerta: mlPorHora < 30,
  };
}

/** Última diurese registrada antes de `antesDe`. */
export function diureseAnterior(
  pacienteId: string,
  controles: Controle[],
  antesDe: string
): { volume: number; horario: string } | undefined {
  const c = controlesDe(pacienteId, controles).find(
    (x) => x.horario < antesDe && x.balanco?.diureseMl != null
  );
  return c ? { volume: c.balanco!.diureseMl!, horario: c.horario } : undefined;
}

export interface ResultadoBalanco {
  total: number;
  entradas: number;
  saidas: number;
  memoria: string;
}

export function calcularBalanco(b: BalancoHidrico): ResultadoBalanco {
  const vo = b.ingestaOralMl ?? 0;
  const ev = b.infusaoEvMl ?? 0;
  const diurese = b.diureseMl ?? 0;
  const perdas = b.outrasPerdasMl ?? 0;
  const entradas = vo + ev;
  const saidas = diurese + perdas;
  return {
    total: entradas - saidas,
    entradas,
    saidas,
    memoria: `entradas ${entradas} mL (${vo} VO + ${ev} EV) − saídas ${saidas} mL (${diurese} diurese + ${perdas} outras perdas)`,
  };
}

export interface AlertaClinico {
  campo: string;
  label: string;
  valor: string;
  motivo: string;
}

/**
 * Alertas clínicos de um conjunto de valores.
 * Usados tanto no quadro quanto no banner do modal, antes de salvar.
 */
export function alertasClinicos(c: Partial<Controle>): AlertaClinico[] {
  const out: AlertaClinico[] = [];
  const { paSistolica: pas, paDiastolica: pad } = c;
  if ((pas != null && pas >= 140) || (pad != null && pad >= 90)) {
    out.push({
      campo: 'pa',
      label: 'PA',
      valor: `${pas ?? '—'}/${pad ?? '—'} mmHg`,
      motivo: 'pressão arterial ≥ 140/90',
    });
  }
  if (c.fc != null && c.fc > 110) {
    out.push({ campo: 'fc', label: 'FC', valor: `${c.fc} bpm`, motivo: 'taquicardia materna > 110 bpm' });
  }
  if (c.bcf != null && (c.bcf < 110 || c.bcf > 160)) {
    out.push({
      campo: 'bcf',
      label: 'BCF',
      valor: `${c.bcf} bpm`,
      motivo: 'fora da faixa 110–160 bpm',
    });
  }
  if (c.fr != null && c.fr > 24) {
    out.push({ campo: 'fr', label: 'FR', valor: `${c.fr} irpm`, motivo: 'taquipneia > 24 irpm' });
  }
  if (c.temperatura != null && c.temperatura >= 37.8) {
    out.push({
      campo: 'temperatura',
      label: 'Temp',
      valor: `${c.temperatura.toFixed(1).replace('.', ',')} °C`,
      motivo: 'temperatura ≥ 37,8 °C',
    });
  }
  if (c.spo2 != null && c.spo2 < 95) {
    out.push({ campo: 'spo2', label: 'SpO₂', valor: `${c.spo2}%`, motivo: 'saturação < 95%' });
  }
  if (c.toque?.dilatacaoCm != null && c.toque.dilatacaoCm >= 10) {
    out.push({
      campo: 'dilatacao',
      label: 'Dilatação',
      valor: '10 cm',
      motivo: 'dilatação completa',
    });
  }
  return out;
}

export function formatarNumero(v: number | undefined, casas = 0): string {
  if (v == null) return '—';
  return v.toFixed(casas).replace('.', ',');
}

export function novoId(prefixo = 'id'): string {
  const c = globalThis.crypto;
  if (c && 'randomUUID' in c) return `${prefixo}_${c.randomUUID()}`;
  return `${prefixo}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
