import { useState } from 'react';
import type { Desfecho, Paciente, TipoDesfecho } from '../types';
import { DESFECHO_LABEL } from '../types';
import { useApp } from '../state/store';
import { Aviso, Campo, Modal, Secao, SecaoOpcional, Unidade } from './ui';
import { isoComHora } from '../lib/calc';

const num = (v: string): number | undefined =>
  v.trim() === '' ? undefined : Number(v.replace(',', '.'));

// Óbito fetal não entra aqui: é uma SITUAÇÃO da paciente (categoria O.F.),
// porque ela continua internada e ainda vai parir. O desfecho dela será o
// parto, com o recém-nascido registrado como natimorto.
const TIPOS: TipoDesfecho[] = [
  'parto_normal',
  'cesarea',
  'aborto',
  'alta_sem_desfecho',
  'transferida_sem_desfecho',
  'obito_materno',
];

/**
 * Encerra o atendimento e devolve o leito. Arquiva a paciente — nada é
 * excluído, e ela pode ser reaberta pela página Arquivadas.
 */
export function ModalEncerrar({
  paciente,
  onFechar,
}: {
  paciente: Paciente;
  onFechar(): void;
}) {
  const { estado, encerrarAtendimento } = useApp();

  const [tipo, setTipo] = useState<TipoDesfecho>('parto_normal');
  const [hora, setHora] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
  const [indicacao, setIndicacao] = useState('');
  const [causa, setCausa] = useState('');
  const [destino, setDestino] = useState('');
  const [motivo, setMotivo] = useState('');

  const [temRn, setTemRn] = useState(true);
  const [sexo, setSexo] = useState<'F' | 'M' | 'indeterminado'>('F');
  const [peso, setPeso] = useState('');
  const [apgar1, setApgar1] = useState('');
  const [apgar5, setApgar5] = useState('');
  const [destinoRn, setDestinoRn] = useState('Alojamento conjunto');

  const leito = estado.leitos.find((l) => l.id === paciente.leitoId);
  const nasceu = tipo === 'parto_normal' || tipo === 'cesarea';
  const obito = tipo === 'obito_materno';
  const transferencia = tipo === 'transferida_sem_desfecho';

  const valido = transferencia ? destino.trim().length > 1 : obito ? causa.trim().length > 1 : true;

  const confirmar = () => {
    if (!valido) return;
    const desfecho: Desfecho = {
      tipo,
      horario: isoComHora(hora),
      indicacao: tipo === 'cesarea' ? indicacao.trim() || undefined : undefined,
      causa: obito ? causa.trim() : undefined,
      transferidaPara: transferencia ? destino.trim() : undefined,
      motivo: transferencia ? motivo.trim() || undefined : undefined,
      rn:
        nasceu && temRn
          ? {
              sexo,
              pesoGramas: num(peso),
              apgar1: num(apgar1),
              apgar5: num(apgar5),
              destino: destinoRn,
            }
          : undefined,
    };
    encerrarAtendimento(paciente.id, desfecho);
    onFechar();
  };

  return (
    <Modal
      titulo="Encerrar atendimento"
      largura={760}
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
        </div>
      }
      rodape={
        <>
          <div style={{ flex: '1 1 240px', color: 'var(--text-dim)', fontSize: 11.5, lineHeight: 1.5 }}>
            O leito {leito?.nome ?? ''} passa para “em limpeza” e a paciente vai para
            Arquivadas, com todo o histórico.
          </div>
          <div style={{ flex: '0 0 auto', display: 'flex', gap: 9 }}>
            <button type="button" className="btn" onClick={onFechar}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" onClick={confirmar} disabled={!valido}>
              Encerrar e liberar leito
            </button>
          </div>
        </>
      }
    >
      <Secao titulo="Desfecho">
        <Campo label="O que aconteceu" span={3}>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDesfecho)}
            aria-label="Tipo de desfecho"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {DESFECHO_LABEL[t]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Horário">
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} aria-label="Horário do desfecho" />
        </Campo>

        {tipo === 'cesarea' && (
          <Campo label="Indicação da cesárea" span={4}>
            <input
              value={indicacao}
              onChange={(e) => setIndicacao(e.target.value)}
              placeholder="Ex.: sofrimento fetal agudo, desproporção céfalo-pélvica"
              aria-label="Indicação da cesárea"
            />
          </Campo>
        )}

        {obito && (
          <Campo label="Causa" span={4} dica="Campo obrigatório para registro de óbito.">
            <input
              value={causa}
              onChange={(e) => setCausa(e.target.value)}
              placeholder="Causa do óbito materno"
              aria-label="Causa do óbito"
            />
          </Campo>
        )}

        {transferencia && (
          <>
            <Campo label="Transferida para" span={2} dica="Campo obrigatório.">
              <input
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Nome do serviço de destino"
                aria-label="Serviço de destino"
                list="destinos-conhecidos"
              />
            </Campo>
            <Campo label="Motivo" span={2}>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-label="Motivo da transferência" />
            </Campo>
            <datalist id="destinos-conhecidos">
              {Array.from(
                new Set(
                  estado.pacientes
                    .map((p) => p.desfecho?.transferidaPara)
                    .filter((x): x is string => Boolean(x))
                )
              ).map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </>
        )}
      </Secao>

      {nasceu && (
        <SecaoOpcional
          titulo="Registrar dados do recém-nascido"
          ativo={temRn}
          onToggle={setTemRn}
          rodape="Natimorto: marque a situação O.F. na caixa do leito e escolha Natimorto no destino."
        >
          <Campo label="Sexo">
            <select
              value={sexo}
              onChange={(e) => setSexo(e.target.value as 'F' | 'M' | 'indeterminado')}
              aria-label="Sexo do recém-nascido"
            >
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
              <option value="indeterminado">Indeterminado</option>
            </select>
          </Campo>
          <Campo label="Peso">
            <input inputMode="numeric" value={peso} onChange={(e) => setPeso(e.target.value)} aria-label="Peso do recém-nascido" />
            <Unidade>g</Unidade>
          </Campo>
          <Campo label="Apgar 1.º min">
            <input inputMode="numeric" value={apgar1} onChange={(e) => setApgar1(e.target.value)} aria-label="Apgar no primeiro minuto" />
          </Campo>
          <Campo label="Apgar 5.º min">
            <input inputMode="numeric" value={apgar5} onChange={(e) => setApgar5(e.target.value)} aria-label="Apgar no quinto minuto" />
          </Campo>
          <Campo label="Destino do recém-nascido" span={4}>
            <select value={destinoRn} onChange={(e) => setDestinoRn(e.target.value)} aria-label="Destino do recém-nascido">
              <option>Alojamento conjunto</option>
              <option>UTI neonatal</option>
              <option>Unidade de cuidados intermediários</option>
              <option>Natimorto</option>
              <option>Outro</option>
            </select>
          </Campo>
        </SecaoOpcional>
      )}

      {obito && (
        <Aviso tom="alerta" titulo="Registro de óbito">
          Fica gravado no histórico com seu nome e horário, e não pode ser apagado — só
          corrigido por um registro novo. Confira a causa antes de confirmar.
        </Aviso>
      )}
    </Modal>
  );
}
