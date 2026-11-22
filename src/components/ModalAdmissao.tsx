import { useState } from 'react';
import type { DinamicaUterina, Paciente, StatusPaciente } from '../types';
import { STATUS_LABEL } from '../types';
import { useApp } from '../state/store';
import { Campo, Modal, Secao, SecaoOpcional, Unidade } from './ui';
import { agoraIso, isoComHora } from '../lib/calc';
import { formatarIntervalo } from './LinhaPaciente';

const num = (v: string): number | undefined =>
  v.trim() === '' ? undefined : Number(v.replace(',', '.'));

export function ModalAdmissao({ onFechar }: { onFechar(): void }) {
  const { estado, admitir, usuarioAtual, sessaoAtiva, liberarLeito } = useApp();

  // A lista mostra TODOS os leitos da sessão, não só os livres: um leito que
  // some sem explicação faz a pessoa achar que o app está quebrado.
  const leitosDaSessao = estado.leitos.filter((l) => l.sessaoId === sessaoAtiva.id);
  const disponiveis = leitosDaSessao.filter((l) => l.status === 'livre' && l.ativo);

  const ocupantePorLeito = new Map(
    estado.pacientes
      .filter((p) => !p.arquivada && p.leitoId)
      .map((p) => [p.leitoId as string, p.nome])
  );

  const motivoIndisponivel = (l: (typeof leitosDaSessao)[number]): string | null => {
    if (!l.ativo) return 'inativo';
    if (l.status === 'ocupado') return ocupantePorLeito.get(l.id) ?? 'ocupado';
    if (l.status === 'limpeza') return 'em limpeza';
    if (l.status === 'bloqueado') return l.observacao ? `bloqueado — ${l.observacao}` : 'bloqueado';
    return null;
  };

  const emLimpeza = leitosDaSessao.filter((l) => l.status === 'limpeza' && l.ativo);

  const [leitoId, setLeitoId] = useState(disponiveis[0]?.id ?? '');
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [categoriaId, setCategoriaId] = useState(estado.categorias[0]?.id ?? '');
  const [status, setStatus] = useState<StatusPaciente>('internada');
  const [g, setG] = useState('');
  const [p, setP] = useState('');
  const [a, setA] = useState('');
  const [modoIg, setModoIg] = useState<'dum' | 'ig'>('dum');
  const [dum, setDum] = useState('');
  const [igSem, setIgSem] = useState('');
  const [igDias, setIgDias] = useState('');
  const [comorbidades, setComorbidades] = useState<string[]>([]);
  const [outraComorbidade, setOutraComorbidade] = useState('');
  const [du, setDu] = useState<DinamicaUterina | undefined>();
  const [intervalo, setIntervalo] = useState(240);
  const [observacoes, setObservacoes] = useState('');

  const [temVitais, setTemVitais] = useState(true);
  const [pas, setPas] = useState('');
  const [pad, setPad] = useState('');
  const [fc, setFc] = useState('');
  const [bcf, setBcf] = useState('');
  const [temp, setTemp] = useState('');

  const [exame, setExame] = useState('');
  const [exameHora, setExameHora] = useState('');
  const [exames, setExames] = useState<{ texto: string; horarioProgramado?: string }[]>([]);

  const semLeito = disponiveis.length === 0;
  const valido = nome.trim().length > 2 && leitoId !== '' && categoriaId !== '';

  const salvar = () => {
    if (!valido) return;
    const lista = [...comorbidades];
    if (outraComorbidade.trim()) lista.push(outraComorbidade.trim());

    const paciente: Omit<Paciente, 'id' | 'criadoEm' | 'atualizadoEm' | 'arquivada'> = {
      sessaoId: sessaoAtiva.id,
      leitoId,
      nome: nome.trim(),
      idade: num(idade),
      categoriaId,
      status,
      paridadeG: num(g),
      paridadeP: num(p),
      paridadeA: num(a),
      dum: modoIg === 'dum' && dum ? new Date(dum).toISOString() : undefined,
      igAdmissaoSemanas: modoIg === 'ig' ? num(igSem) : undefined,
      igAdmissaoDias: modoIg === 'ig' ? num(igDias) : undefined,
      igDataReferencia: modoIg === 'ig' ? agoraIso() : undefined,
      comorbidades: lista.length ? lista : ['A confirmar'],
      dinamicaUterina: du,
      intervaloControleMin: intervalo,
      observacoes: observacoes.trim() || undefined,
    };

    admitir({
      paciente,
      controleInicial: temVitais
        ? {
            horario: isoComHora(
              new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            ),
            responsavelId: usuarioAtual.id,
            responsavelNome: usuarioAtual.nome,
            responsavelFuncao: usuarioAtual.funcao,
            paSistolica: num(pas),
            paDiastolica: num(pad),
            fc: num(fc),
            bcf: num(bcf),
            temperatura: num(temp),
            dinamicaUterina: du,
          }
        : undefined,
      exames,
    });
    onFechar();
  };

  return (
    <Modal
      titulo="Admitir paciente"
      largura={860}
      onFechar={onFechar}
      subtitulo={
        <p style={{ margin: 0, color: 'var(--color-plum-300)', fontSize: 11.5 }}>
          {sessaoAtiva.nome} · ambiente de demonstração — não insira dados reais.
        </p>
      }
      rodape={
        <>
          <div style={{ flex: '1 1 240px', color: 'var(--text-dim)', fontSize: 11.5 }}>
            {semLeito
              ? 'Nenhum leito livre: libere um leito em Configurações › Leitos antes de admitir.'
              : `${disponiveis.length} leito(s) livre(s) disponível(is).`}
          </div>
          <div style={{ flex: '0 0 auto', display: 'flex', gap: 9 }}>
            <button type="button" className="btn" onClick={onFechar}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" onClick={salvar} disabled={!valido}>
              Admitir paciente
            </button>
          </div>
        </>
      }
    >
      <Secao titulo="Identificação">
        <Campo
          label="Leito"
          dica={
            semLeito
              ? 'Nenhum leito livre nesta sessão.'
              : `${disponiveis.length} livre(s) de ${leitosDaSessao.length}.`
          }
        >
          <select value={leitoId} onChange={(e) => setLeitoId(e.target.value)} aria-label="Leito">
            {semLeito && <option value="">Nenhum livre</option>}
            {leitosDaSessao.map((l) => {
              const motivo = motivoIndisponivel(l);
              return (
                <option key={l.id} value={l.id} disabled={motivo !== null}>
                  {l.nome}
                  {motivo ? ` — ${motivo}` : ''}
                </option>
              );
            })}
          </select>
        </Campo>
        <Campo label="Nome" span={2}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome da paciente" />
        </Campo>
        <Campo label="Idade">
          <input inputMode="numeric" value={idade} onChange={(e) => setIdade(e.target.value)} aria-label="Idade" />
          <Unidade>anos</Unidade>
        </Campo>
        <Campo label="Categoria" span={2}>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} aria-label="Categoria">
            {estado.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Status inicial" span={2}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusPaciente)}
            aria-label="Status inicial"
          >
            {(['internada', 'trabalho_de_parto', 'centro_cirurgico', 'puerpera'] as StatusPaciente[]).map(
              (s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              )
            )}
          </select>
        </Campo>
      </Secao>

      {emLimpeza.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 9,
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderLeft: '4px solid var(--color-warn)',
            borderRadius: 10,
            background: 'rgba(232,163,60,0.09)',
          }}
        >
          <span style={{ flex: '1 1 240px', color: 'var(--warn-text)', fontSize: 12 }}>
            {emLimpeza.length === 1
              ? `O leito ${emLimpeza[0].nome} está em limpeza.`
              : `${emLimpeza.length} leitos estão em limpeza.`}{' '}
            Libere para poder admitir nele.
          </span>
          {emLimpeza.map((l) => (
            <button
              key={l.id}
              type="button"
              className="btn"
              style={{ height: 32, padding: '0 11px', fontSize: 11.5 }}
              onClick={() => {
                liberarLeito(l.id);
                setLeitoId(l.id);
              }}
            >
              Liberar {l.nome}
            </button>
          ))}
        </div>
      )}

      <Secao titulo="Obstétrico">
        <Campo label="Gestações (G)">
          <input inputMode="numeric" value={g} onChange={(e) => setG(e.target.value)} aria-label="Gestações" />
        </Campo>
        <Campo label="Partos (P)">
          <input inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} aria-label="Partos" />
        </Campo>
        <Campo label="Abortos (A)">
          <input inputMode="numeric" value={a} onChange={(e) => setA(e.target.value)} aria-label="Abortos" />
        </Campo>
        <Campo label="Idade gestacional por">
          <select value={modoIg} onChange={(e) => setModoIg(e.target.value as 'dum' | 'ig')} aria-label="Modo da idade gestacional">
            <option value="dum">DUM</option>
            <option value="ig">IG informada</option>
          </select>
        </Campo>
        {modoIg === 'dum' ? (
          <Campo label="Data da última menstruação" span={2} dica="A IG é recalculada todos os dias a partir daqui.">
            <input type="date" value={dum} onChange={(e) => setDum(e.target.value)} aria-label="Data da última menstruação" />
          </Campo>
        ) : (
          <>
            <Campo label="Semanas">
              <input inputMode="numeric" value={igSem} onChange={(e) => setIgSem(e.target.value)} aria-label="Semanas" />
              <Unidade>s</Unidade>
            </Campo>
            <Campo label="Dias" dica="Referência: hoje. A IG autoincrementa a partir desta data.">
              <input inputMode="numeric" value={igDias} onChange={(e) => setIgDias(e.target.value)} aria-label="Dias" />
              <Unidade>d</Unidade>
            </Campo>
          </>
        )}
        <div style={{ gridColumn: 'span 2' }}>
          <span className="lbl">Dinâmica uterina</span>
          <div style={{ display: 'flex', gap: 7 }} role="radiogroup" aria-label="Dinâmica uterina">
            {(['ausente', 'esparsa', 'presente'] as DinamicaUterina[]).map((v) => (
              <label key={v} className={du === v ? 'pill pill--on' : 'pill'} style={{ flex: '1 1 0' }}>
                <input type="radio" name="du-adm" checked={du === v} onChange={() => setDu(v)} />
                {v === 'ausente' ? 'Ausente' : v === 'esparsa' ? 'Esparsa' : 'Presente'}
              </label>
            ))}
          </div>
        </div>
        <Campo label="Intervalo de controles" span={2} dica="Define quando o alerta de atraso dispara.">
          <select
            value={intervalo}
            onChange={(e) => setIntervalo(Number(e.target.value))}
            aria-label="Intervalo de controles"
          >
            {estado.config.intervalosControleMin.map((m) => (
              <option key={m} value={m}>
                {formatarIntervalo(m)}
              </option>
            ))}
          </select>
        </Campo>
      </Secao>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="sec">Comorbidades</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {estado.config.comorbidades.map((c) => {
            const on = comorbidades.includes(c);
            return (
              <label key={c} className={on ? 'pill pill--on' : 'pill'} style={{ height: 32 }}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setComorbidades((atual) =>
                      on ? atual.filter((x) => x !== c) : [...atual, c]
                    )
                  }
                />
                {c}
              </label>
            );
          })}
        </div>
        <div style={{ marginTop: 10, maxWidth: 360 }}>
          <label className="lbl" htmlFor="outra-com">
            Outra
          </label>
          <div className="field">
            <input
              id="outra-com"
              value={outraComorbidade}
              onChange={(e) => setOutraComorbidade(e.target.value)}
              placeholder="Descreva, se não estiver na lista"
            />
          </div>
        </div>
      </fieldset>

      <SecaoOpcional
        titulo="Registrar primeiros sinais vitais"
        ativo={temVitais}
        onToggle={setTemVitais}
        rodape="Cria o primeiro controle já no momento da admissão, com você como responsável."
      >
        <div style={{ gridColumn: 'span 2' }}>
          <span className="lbl">Pressão arterial</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div className="field" style={{ flex: '1 1 0', minWidth: 0 }}>
              <input inputMode="numeric" value={pas} onChange={(e) => setPas(e.target.value)} aria-label="Pressão sistólica" />
            </div>
            <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>/</span>
            <div className="field" style={{ flex: '1 1 0', minWidth: 0 }}>
              <input inputMode="numeric" value={pad} onChange={(e) => setPad(e.target.value)} aria-label="Pressão diastólica" />
              <Unidade>mmHg</Unidade>
            </div>
          </div>
        </div>
        <Campo label="Freq. cardíaca">
          <input inputMode="numeric" value={fc} onChange={(e) => setFc(e.target.value)} aria-label="Frequência cardíaca" />
          <Unidade>bpm</Unidade>
        </Campo>
        <Campo label="BCF">
          <input inputMode="numeric" value={bcf} onChange={(e) => setBcf(e.target.value)} aria-label="Batimentos cardíacos fetais" />
          <Unidade>bpm</Unidade>
        </Campo>
        <Campo label="Temperatura">
          <input value={temp} onChange={(e) => setTemp(e.target.value)} aria-label="Temperatura" />
          <Unidade>°C</Unidade>
        </Campo>
      </SecaoOpcional>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="sec">Exames e programações</legend>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <label className="lbl" htmlFor="novo-exame">
              Descrição
            </label>
            <div className="field">
              <input
                id="novo-exame"
                value={exame}
                onChange={(e) => setExame(e.target.value)}
                placeholder="Ex.: Hemograma, USG obstétrica"
              />
            </div>
          </div>
          <div style={{ flex: '0 0 130px' }}>
            <label className="lbl" htmlFor="novo-exame-hora">
              Horário
            </label>
            <div className="field">
              <input
                id="novo-exame-hora"
                type="time"
                value={exameHora}
                onChange={(e) => setExameHora(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (!exame.trim()) return;
              setExames((l) => [
                ...l,
                { texto: exame.trim(), horarioProgramado: exameHora || undefined },
              ]);
              setExame('');
              setExameHora('');
            }}
          >
            Adicionar
          </button>
        </div>
        {exames.length > 0 && (
          <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--text-dim)' }}>
            {exames.map((x, i) => (
              <li key={`${x.texto}-${i}`}>
                {x.texto} {x.horarioProgramado ? `· ${x.horarioProgramado}` : ''}
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <div>
        <label className="lbl" htmlFor="obs-adm">
          Observações
        </label>
        <textarea
          id="obs-adm"
          rows={2}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          style={{
            width: '100%',
            border: '1px solid var(--border)',
            borderRadius: 9,
            padding: '10px 11px',
            background: 'var(--surface)',
            color: 'var(--text)',
            resize: 'vertical',
            outline: 0,
          }}
        />
      </div>
    </Modal>
  );
}
