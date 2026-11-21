import { useMemo, useState } from 'react';
import type { DinamicaUterina, Paciente, StatusPaciente } from '../types';
import { STATUS_LABEL } from '../types';
import { useApp } from '../state/store';
import { Aviso, Campo, Modal, Secao, Unidade } from './ui';
import { idadeGestacional } from '../lib/calc';
import { formatarIntervalo } from './LinhaPaciente';

const num = (v: string): number | undefined =>
  v.trim() === '' ? undefined : Number(v.replace(',', '.'));
const txt = (v: number | undefined): string => (v == null ? '' : String(v));

/**
 * Edição dos dados da paciente: nome, idade, IG, situação, paridade,
 * comorbidades, intervalo de controles e leito. Abre pelo botão da barra
 * superior (com seletor de paciente) ou pelo menu da linha.
 */
export function ModalEditarPaciente({
  paciente,
  onFechar,
}: {
  paciente: Paciente | null; // null = abrir com o seletor vazio
  onFechar(): void;
}) {
  const { estado, sessaoAtiva, atualizarPaciente, transferirLeito } = useApp();

  const ativas = useMemo(
    () =>
      estado.pacientes
        .filter((p) => !p.arquivada && p.sessaoId === sessaoAtiva.id)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [estado.pacientes, sessaoAtiva.id]
  );

  const [selecionadaId, setSelecionadaId] = useState(paciente?.id ?? ativas[0]?.id ?? '');
  const atual = estado.pacientes.find((p) => p.id === selecionadaId) ?? null;

  // Os campos recarregam quando a paciente escolhida muda.
  const [versao, setVersao] = useState(0);
  const chave = `${selecionadaId}-${versao}`;

  if (!atual) {
    return (
      <Modal titulo="Editar dados da paciente" largura={760} onFechar={onFechar}>
        <p style={{ margin: 0, color: 'var(--text-dim)' }}>
          Não há pacientes ativas em {sessaoAtiva.nome}.
        </p>
      </Modal>
    );
  }

  return (
    <Formulario
      key={chave}
      paciente={atual}
      ativas={ativas}
      onTrocarPaciente={(id) => {
        setSelecionadaId(id);
        setVersao((v) => v + 1);
      }}
      onFechar={onFechar}
      onSalvar={(mudancas, novoLeitoId) => {
        atualizarPaciente(atual.id, mudancas, 'dados cadastrais');
        if (novoLeitoId && novoLeitoId !== atual.leitoId) {
          transferirLeito(atual.id, novoLeitoId);
        }
        onFechar();
      }}
    />
  );
}

function Formulario({
  paciente,
  ativas,
  onTrocarPaciente,
  onFechar,
  onSalvar,
}: {
  paciente: Paciente;
  ativas: Paciente[];
  onTrocarPaciente(id: string): void;
  onFechar(): void;
  onSalvar(mudancas: Partial<Paciente>, novoLeitoId?: string): void;
}) {
  const { estado, sessaoAtiva } = useApp();

  const [nome, setNome] = useState(paciente.nome);
  const [idade, setIdade] = useState(txt(paciente.idade));
  const [categoriaId, setCategoriaId] = useState(paciente.categoriaId);
  const [status, setStatus] = useState<StatusPaciente>(paciente.status);
  const [g, setG] = useState(txt(paciente.paridadeG));
  const [p, setP] = useState(txt(paciente.paridadeP));
  const [a, setA] = useState(txt(paciente.paridadeA));
  const [modoIg, setModoIg] = useState<'dum' | 'ig' | 'nenhuma'>(
    paciente.dum ? 'dum' : paciente.igAdmissaoSemanas != null ? 'ig' : 'nenhuma'
  );
  const [dum, setDum] = useState(paciente.dum ? paciente.dum.slice(0, 10) : '');
  const [igSem, setIgSem] = useState(txt(paciente.igAdmissaoSemanas));
  const [igDias, setIgDias] = useState(txt(paciente.igAdmissaoDias));
  const [comorbidades, setComorbidades] = useState<string[]>(paciente.comorbidades);
  const [outra, setOutra] = useState('');
  const [du, setDu] = useState<DinamicaUterina | undefined>(paciente.dinamicaUterina);
  const [intervalo, setIntervalo] = useState(paciente.intervaloControleMin);
  const [leitoId, setLeitoId] = useState(paciente.leitoId ?? '');
  const [observacoes, setObservacoes] = useState(paciente.observacoes ?? '');

  // Leitos livres da sessão, mais o leito atual da paciente.
  const leitosDisponiveis = estado.leitos.filter(
    (l) =>
      l.sessaoId === sessaoAtiva.id &&
      (l.id === paciente.leitoId || (l.status === 'livre' && l.ativo))
  );

  const previa = idadeGestacional({
    ...paciente,
    dum: modoIg === 'dum' && dum ? new Date(dum).toISOString() : undefined,
    igAdmissaoSemanas: modoIg === 'ig' ? num(igSem) : undefined,
    igAdmissaoDias: modoIg === 'ig' ? num(igDias) : undefined,
    igDataReferencia: modoIg === 'ig' ? new Date().toISOString() : undefined,
  });

  const categoriaMudou = categoriaId !== paciente.categoriaId;

  const salvar = () => {
    const lista = [...comorbidades];
    if (outra.trim()) lista.push(outra.trim());
    onSalvar(
      {
        nome: nome.trim() || paciente.nome,
        idade: num(idade),
        categoriaId,
        status,
        paridadeG: num(g),
        paridadeP: num(p),
        paridadeA: num(a),
        dum: modoIg === 'dum' && dum ? new Date(dum).toISOString() : undefined,
        igAdmissaoSemanas: modoIg === 'ig' ? num(igSem) : undefined,
        igAdmissaoDias: modoIg === 'ig' ? num(igDias) : undefined,
        igDataReferencia: modoIg === 'ig' ? new Date().toISOString() : undefined,
        comorbidades: lista.length ? lista : ['A confirmar'],
        dinamicaUterina: du,
        intervaloControleMin: intervalo,
        observacoes: observacoes.trim() || undefined,
      },
      leitoId || undefined
    );
  };

  return (
    <Modal
      titulo="Editar dados da paciente"
      largura={860}
      onFechar={onFechar}
      subtitulo={
        <p style={{ margin: 0, color: 'var(--color-plum-300)', fontSize: 11.5 }}>
          {sessaoAtiva.nome} · a alteração fica no histórico com seu nome e horário.
        </p>
      }
      rodape={
        <>
          <div style={{ flex: '1 1 240px', color: 'var(--text-dim)', fontSize: 11.5 }}>
            Para registrar alta, óbito ou transferência, use Encerrar atendimento no menu da
            linha.
          </div>
          <div style={{ flex: '0 0 auto', display: 'flex', gap: 9 }}>
            <button type="button" className="btn" onClick={onFechar}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" onClick={salvar}>
              Salvar alterações
            </button>
          </div>
        </>
      }
    >
      <Secao titulo="Paciente">
        <Campo label="Trocar de paciente" span={2}>
          <select
            value={paciente.id}
            onChange={(e) => onTrocarPaciente(e.target.value)}
            aria-label="Paciente a editar"
          >
            {ativas.map((x) => {
              const l = estado.leitos.find((y) => y.id === x.leitoId);
              return (
                <option key={x.id} value={x.id}>
                  {l ? `${l.nome} — ` : ''}
                  {x.nome}
                </option>
              );
            })}
          </select>
        </Campo>
        <Campo label="Leito" span={2}>
          <select value={leitoId} onChange={(e) => setLeitoId(e.target.value)} aria-label="Leito">
            {leitosDisponiveis.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
                {l.id === paciente.leitoId ? ' (atual)' : ''}
              </option>
            ))}
          </select>
        </Campo>
      </Secao>

      <Secao titulo="Identificação">
        <Campo label="Nome" span={2}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome" />
        </Campo>
        <Campo label="Idade">
          <input inputMode="numeric" value={idade} onChange={(e) => setIdade(e.target.value)} aria-label="Idade" />
          <Unidade>anos</Unidade>
        </Campo>
        <Campo label="Situação (categoria)">
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            aria-label="Categoria"
          >
            {estado.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Status" span={2}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusPaciente)}
            aria-label="Status"
          >
            {(
              ['internada', 'trabalho_de_parto', 'centro_cirurgico', 'puerpera'] as StatusPaciente[]
            ).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Intervalo de controles" span={2}>
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

      {categoriaMudou && (
        <Aviso tom="atencao" titulo="A cor da linha vai mudar">
          Categoria é a identidade visual no quadro. O que aconteceu com a paciente (parto,
          cesárea, aborto) é o desfecho, registrado em Encerrar atendimento — não aqui.
        </Aviso>
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
          <select
            value={modoIg}
            onChange={(e) => setModoIg(e.target.value as 'dum' | 'ig' | 'nenhuma')}
            aria-label="Modo da idade gestacional"
          >
            <option value="dum">DUM</option>
            <option value="ig">IG informada</option>
            <option value="nenhuma">Não se aplica</option>
          </select>
        </Campo>
        {modoIg === 'dum' && (
          <Campo label="Data da última menstruação" span={2} dica={`Resulta em ${previa}, recalculado todo dia.`}>
            <input type="date" value={dum} onChange={(e) => setDum(e.target.value)} aria-label="DUM" />
          </Campo>
        )}
        {modoIg === 'ig' && (
          <>
            <Campo label="Semanas">
              <input inputMode="numeric" value={igSem} onChange={(e) => setIgSem(e.target.value)} aria-label="Semanas" />
              <Unidade>s</Unidade>
            </Campo>
            <Campo label="Dias" dica={`Resulta em ${previa}, a partir de hoje.`}>
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
                <input type="radio" name="du-edit" checked={du === v} onChange={() => setDu(v)} />
                {v === 'ausente' ? 'Ausente' : v === 'esparsa' ? 'Esparsa' : 'Presente'}
              </label>
            ))}
          </div>
        </div>
      </Secao>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="sec">Comorbidades</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Array.from(new Set([...estado.config.comorbidades, ...comorbidades])).map((c) => {
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
          <label className="lbl" htmlFor="outra-edit">
            Outra
          </label>
          <div className="field">
            <input
              id="outra-edit"
              value={outra}
              onChange={(e) => setOutra(e.target.value)}
              placeholder="Descreva, se não estiver na lista"
            />
          </div>
        </div>
      </fieldset>

      <div>
        <label className="lbl" htmlFor="obs-edit">
          Observações
        </label>
        <textarea
          id="obs-edit"
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
