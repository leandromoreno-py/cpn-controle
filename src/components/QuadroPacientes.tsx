import { useMemo, useState } from 'react';
import type { Paciente } from '../types';
import { useApp } from '../state/store';
import { LinhaPaciente, formatarIntervalo } from './LinhaPaciente';
import { estiloCategoria } from '../lib/contrast';
import { situacaoControle } from '../lib/calc';

const COLUNAS =
  '78px minmax(190px, 1.25fr) 94px 80px minmax(170px, 1.3fr) 142px 132px 92px';

type Ordem = 'leito' | 'atraso' | 'categoria';

export function QuadroPacientes({
  busca,
  soAtrasadas,
  categoriaFiltro,
  ordem,
  onRegistrar,
  onAbrirPaciente,
}: {
  busca: string;
  soAtrasadas: boolean;
  categoriaFiltro: string | null;
  ordem: Ordem;
  onRegistrar(p: Paciente): void;
  onAbrirPaciente(p: Paciente): void;
}) {
  const { estado, tema } = useApp();
  const [mostrarAltas, setMostrarAltas] = useState(false);

  const superficie = tema === 'escuro' ? '#1E1228' : '#FFFFFF';

  const ativas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const nomeLeito = (p: Paciente) =>
      estado.leitos.find((l) => l.id === p.leitoId)?.nome.toLowerCase() ?? '';

    let lista = estado.pacientes.filter((p) => !p.arquivada);

    if (termo) {
      lista = lista.filter(
        (p) => p.nome.toLowerCase().includes(termo) || nomeLeito(p).includes(termo)
      );
    }
    if (categoriaFiltro) {
      lista = lista.filter((p) => p.categoriaId === categoriaFiltro);
    }
    if (soAtrasadas) {
      lista = lista.filter(
        (p) => situacaoControle(p, estado.controles).estado === 'atrasado'
      );
    }

    const copia = [...lista];
    if (ordem === 'leito') {
      copia.sort((a, b) => nomeLeito(a).localeCompare(nomeLeito(b), 'pt-BR'));
    } else if (ordem === 'atraso') {
      const atraso = (p: Paciente) => {
        const s = situacaoControle(p, estado.controles);
        return (s.minutosDesde ?? Number.MAX_SAFE_INTEGER) - p.intervaloControleMin;
      };
      copia.sort((a, b) => atraso(b) - atraso(a));
    } else {
      copia.sort((a, b) => {
        const ca = estado.categorias.find((c) => c.id === a.categoriaId)?.ordem ?? 99;
        const cb = estado.categorias.find((c) => c.id === b.categoriaId)?.ordem ?? 99;
        return ca - cb || nomeLeito(a).localeCompare(nomeLeito(b), 'pt-BR');
      });
    }
    return copia;
  }, [busca, categoriaFiltro, soAtrasadas, ordem, estado]);

  const arquivadas24h = estado.pacientes.filter(
    (p) =>
      p.arquivada &&
      p.arquivadaEm != null &&
      Date.now() - new Date(p.arquivadaEm).getTime() < 86_400_000
  );

  const livres = estado.leitos.filter((l) => l.status === 'livre' && l.ativo).length;
  const limpeza = estado.leitos.filter((l) => l.status === 'limpeza').length;
  const ocupados = estado.leitos.filter((l) => l.status === 'ocupado').length;

  return (
    <div style={{ padding: '12px 24px 28px' }}>
      {/* LEGENDA */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
          padding: '2px 0 14px',
        }}
      >
        <Secao>Categorias</Secao>
        {estado.categorias.map((c) => {
          const e = estiloCategoria(c.cor, superficie, 9, tema === 'escuro');
          return (
            <span
              key={c.id}
              style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 500 }}
            >
              <span
                aria-hidden="true"
                style={{ width: 5, height: 15, borderRadius: 3, background: e.barra, display: 'inline-block' }}
              />
              {c.nome}
            </span>
          );
        })}
        <span aria-hidden="true" style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <Secao>Controles</Secao>
        <Ponto cor="var(--color-ok)">em dia</Ponto>
        <Ponto cor="var(--color-warn)">vencendo</Ponto>
        <Ponto cor="var(--color-late)">atrasado</Ponto>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: COLUNAS,
            gap: 12,
            padding: '10px 16px',
            background: 'var(--head-bg)',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-dim)',
            fontSize: 10.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          <div>Leito</div>
          <div>Paciente</div>
          <div>Paridade</div>
          <div>IG</div>
          <div>Comorbidades</div>
          <div>Dilatação · DU</div>
          <div>Último controle</div>
          <div style={{ textAlign: 'right' }}>Ações</div>
        </div>

        {ativas.length === 0 && (
          <p style={{ padding: 24, margin: 0, color: 'var(--text-dim)' }}>
            Nenhuma paciente corresponde aos filtros.
          </p>
        )}

        {ativas.map((p) => (
          <LinhaPaciente
            key={p.id}
            paciente={p}
            onRegistrar={onRegistrar}
            onAbrirPaciente={onAbrirPaciente}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <button
          type="button"
          className="btn"
          style={{ borderStyle: 'dashed', color: 'var(--text-dim)', background: 'transparent' }}
          onClick={() => setMostrarAltas((v) => !v)}
          aria-expanded={mostrarAltas}
        >
          Altas e transferências das últimas 24h ({arquivadas24h.length})
        </button>
        <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
          Leitos: {ocupados} ocupados · {livres} livres · {limpeza} em limpeza
        </div>
      </div>

      {mostrarAltas && (
        <div className="card" style={{ marginTop: 10, padding: 14 }}>
          {arquivadas24h.length === 0 ? (
            <span style={{ color: 'var(--text-dim)' }}>
              Nenhuma alta ou transferência nas últimas 24 horas.
            </span>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {arquivadas24h.map((p) => (
                <li key={p.id} style={{ marginBottom: 4 }}>
                  {p.nome} — {p.status === 'alta' ? 'alta' : 'transferida'}
                  {p.desfecho?.transferidaPara ? ` para ${p.desfecho.transferidaPara}` : ''} ·
                  intervalo de controles era {formatarIntervalo(p.intervaloControleMin)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Secao({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        color: 'var(--text-dim)',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {children}
    </span>
  );
}

function Ponto({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <span
        aria-hidden="true"
        style={{ width: 9, height: 9, borderRadius: '50%', background: cor }}
      />
      {children}
    </span>
  );
}
