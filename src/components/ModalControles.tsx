import { useMemo, useState } from 'react';
import type {
  BalancoHidrico,
  Controle,
  DinamicaUterina,
  Paciente,
  ToqueVaginal,
  Usuario,
} from '../types';
import {
  COR_LIQUIDO_LABEL,
  FUNCAO_DESCRICAO,
  FUNCAO_LABEL,
  FUNCOES,
  type CorLiquido,
  type FuncaoUsuario,
} from '../types';
import { useApp } from '../state/store';
import { Aviso, Campo, Modal, Secao, SecaoOpcional, Unidade } from './ui';
import { iniciais } from './Sidebar';
import {
  agoraIso,
  alertasClinicos,
  assinatura,
  calcularBalanco,
  debitoUrinario,
  diureseAnterior,
  horaHM,
  idadeGestacional,
  isoComHora,
  paridade,
  situacaoControle,
} from '../lib/calc';
import { formatarIntervalo } from './LinhaPaciente';

const num = (v: string): number | undefined =>
  v.trim() === '' ? undefined : Number(v.replace(',', '.'));

export function ModalControles({
  paciente,
  onFechar,
}: {
  paciente: Paciente;
  onFechar(): void;
}) {
  const { estado, usuarioAtual, registrarControle, tema } = useApp();

  const [hora, setHora] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
  const [responsavel, setResponsavel] = useState<Usuario>(usuarioAtual);
  const [trocando, setTrocando] = useState(false);

  const [pas, setPas] = useState('');
  const [pad, setPad] = useState('');
  const [fc, setFc] = useState('');
  const [fr, setFr] = useState('');
  const [temp, setTemp] = useState('');
  const [spo2, setSpo2] = useState('');
  const [bcf, setBcf] = useState('');
  const [du, setDu] = useState<DinamicaUterina | undefined>(paciente.dinamicaUterina);

  const [temBalanco, setTemBalanco] = useState(false);
  const [vo, setVo] = useState('');
  const [ev, setEv] = useState('');
  const [via, setVia] = useState('Via oral livre');
  const [diurese, setDiurese] = useState('');
  const [perdas, setPerdas] = useState('');

  const [temToque, setTemToque] = useState(false);
  const [dil, setDil] = useState('');
  const [apag, setApag] = useState('');
  const [delee, setDelee] = useState('-1');
  const [bolsa, setBolsa] = useState<'integra' | 'rota'>('integra');
  const [horaRotura, setHoraRotura] = useState('');
  const [corLiquido, setCorLiquido] = useState<CorLiquido>('claro');

  const [obs, setObs] = useState('');

  const horarioIso = useMemo(() => isoComHora(hora), [hora]);

  const balanco: BalancoHidrico | undefined = temBalanco
    ? {
        ingestaOralMl: num(vo),
        infusaoEvMl: num(ev),
        hidratacaoVia: via,
        diureseMl: num(diurese),
        outrasPerdasMl: num(perdas),
      }
    : undefined;

  const toque: ToqueVaginal | undefined = temToque
    ? {
        dilatacaoCm: num(dil),
        apagamentoPct: num(apag),
        delee: Number(delee),
        bolsa,
        horaRotura: bolsa === 'rota' && horaRotura ? horaRotura : undefined,
        corLiquido: bolsa === 'rota' ? corLiquido : undefined,
      }
    : undefined;

  const parcial: Partial<Controle> = {
    paSistolica: num(pas),
    paDiastolica: num(pad),
    fc: num(fc),
    fr: num(fr),
    temperatura: num(temp),
    spo2: num(spo2),
    bcf: num(bcf),
    toque,
  };

  // Alertas recalculados a cada tecla: a pessoa confere antes de salvar.
  const alertas = alertasClinicos(parcial);
  const emAlerta = new Set(alertas.map((a) => a.campo));

  const debito = debitoUrinario(
    num(diurese),
    horarioIso,
    diureseAnterior(paciente.id, estado.controles, horarioIso)
  );
  const resultadoBalanco = balanco ? calcularBalanco(balanco) : null;
  const anterior = diureseAnterior(paciente.id, estado.controles, horarioIso);

  const situacao = situacaoControle(paciente, estado.controles);
  const categoria = estado.categorias.find((c) => c.id === paciente.categoriaId);
  const leito = estado.leitos.find((l) => l.id === paciente.leitoId);

  const salvar = () => {
    const controle: Omit<Controle, 'id'> = {
      pacienteId: paciente.id,
      horario: horarioIso,
      responsavelId: responsavel.id,
      responsavelNome: responsavel.nome,
      responsavelFuncao: responsavel.funcao,
      lancadoPorId: responsavel.id === usuarioAtual.id ? undefined : usuarioAtual.id,
      lancadoPorNome: responsavel.id === usuarioAtual.id ? undefined : usuarioAtual.nome,
      lancadoPorFuncao: responsavel.id === usuarioAtual.id ? undefined : usuarioAtual.funcao,
      ...parcial,
      dinamicaUterina: du,
      balanco,
      toque,
      observacao: obs.trim() || undefined,
    };
    registrarControle(controle);
    onFechar();
  };

  return (
    <>
      <Modal
        titulo="Registrar controles"
        largura={880}
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
              {paciente.idade} anos · {paridade(paciente)} · {idadeGestacional(paciente)}
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
                flex: '1 1 260px',
                minWidth: 0,
                color: 'var(--text-dim)',
                fontSize: 11.5,
                lineHeight: 1.5,
              }}
            >
              O registro é gravado com o nome de quem registra e o horário, e fica no
              histórico de alterações da paciente.
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', gap: 9 }}>
              <button type="button" className="btn" onClick={onFechar}>
                Cancelar
              </button>
              <button type="button" className="btn btn--primary" onClick={salvar}>
                ✓ Salvar controles
              </button>
            </div>
          </>
        }
      >
        {/* FAIXA DE CONTEXTO */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: 14,
            padding: '12px 14px',
            margin: '-18px -22px 0',
            background: 'var(--head-bg)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ flex: '0 0 158px' }}>
            <label className="lbl" htmlFor="hora-registro">
              Horário do registro
            </label>
            <div className="field">
              <input
                id="hora-registro"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>

          <div style={{ flex: '1 1 300px', minWidth: 260 }}>
            <span className="lbl">Registrando como</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                height: 38,
                padding: '0 5px 0 9px',
                border: '1px solid var(--border)',
                borderRadius: 9,
                background: 'var(--surface)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 26,
                  height: 26,
                  flex: '0 0 26px',
                  borderRadius: '50%',
                  background: 'var(--color-plum-700)',
                  color: 'var(--color-plum-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {iniciais(responsavel.nome)}
              </span>
              <span
                style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <strong style={{ fontWeight: 600 }}>
                  {assinatura(responsavel.funcao, responsavel.nome)}
                </strong>{' '}
                <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>
                  · {FUNCAO_DESCRICAO[responsavel.funcao]}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setTrocando(true)}
                style={{
                  marginLeft: 'auto',
                  flex: '0 0 auto',
                  height: 30,
                  padding: '0 10px',
                  borderRadius: 7,
                  border: '1px solid var(--border)',
                  background: 'var(--head-bg)',
                  color: tema === 'escuro' ? 'var(--color-plum-300)' : 'var(--color-plum-700)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Trocar
              </button>
            </div>
          </div>

          <div
            style={{
              flex: '1 1 160px',
              minWidth: 0,
              textAlign: 'right',
              color: 'var(--text-dim)',
              fontSize: 11.5,
              lineHeight: 1.5,
            }}
          >
            {situacao.ultimo
              ? `Último registro às ${horaHM(situacao.ultimo.horario)} por ${assinatura(
                  situacao.ultimo.responsavelFuncao,
                  situacao.ultimo.responsavelNome
                )}`
              : 'Primeiro registro desta paciente'}
            <br />
            Meta de controles: <strong style={{ color: 'var(--text)' }}>
              {formatarIntervalo(paciente.intervaloControleMin)}
            </strong>
          </div>
        </div>

        {alertas.length > 0 && (
          <Aviso
            tom="alerta"
            titulo={`${alertas.length} ${alertas.length === 1 ? 'alerta' : 'alertas'} neste registro`}
          >
            {alertas.map((a) => (
              <div key={a.campo}>
                {a.label} {a.valor} — {a.motivo}.
              </div>
            ))}
            O alerta aparece na linha do quadro assim que você salvar.
          </Aviso>
        )}

        <Secao titulo="Sinais vitais">
          <div style={{ gridColumn: 'span 2' }}>
            <span className="lbl">Pressão arterial</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div
                className={emAlerta.has('pa') ? 'field field--alert' : 'field'}
                style={{ flex: '1 1 0', minWidth: 0 }}
              >
                <label className="sr-only" htmlFor="pas">
                  Pressão sistólica
                </label>
                <input id="pas" inputMode="numeric" value={pas} onChange={(e) => setPas(e.target.value)} />
              </div>
              <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>/</span>
              <div
                className={emAlerta.has('pa') ? 'field field--alert' : 'field'}
                style={{ flex: '1 1 0', minWidth: 0 }}
              >
                <label className="sr-only" htmlFor="pad">
                  Pressão diastólica
                </label>
                <input id="pad" inputMode="numeric" value={pad} onChange={(e) => setPad(e.target.value)} />
                <Unidade>mmHg</Unidade>
              </div>
            </div>
          </div>
          <Campo label="Freq. cardíaca" alerta={emAlerta.has('fc')}>
            <input inputMode="numeric" value={fc} onChange={(e) => setFc(e.target.value)} aria-label="Frequência cardíaca" />
            <Unidade>bpm</Unidade>
          </Campo>
          <Campo label="Freq. respiratória" alerta={emAlerta.has('fr')}>
            <input inputMode="numeric" value={fr} onChange={(e) => setFr(e.target.value)} aria-label="Frequência respiratória" />
            <Unidade>irpm</Unidade>
          </Campo>
          <Campo label="Temperatura" alerta={emAlerta.has('temperatura')}>
            <input value={temp} onChange={(e) => setTemp(e.target.value)} aria-label="Temperatura" />
            <Unidade>°C</Unidade>
          </Campo>
          <Campo label="Saturação" alerta={emAlerta.has('spo2')}>
            <input inputMode="numeric" value={spo2} onChange={(e) => setSpo2(e.target.value)} aria-label="Saturação de oxigênio" />
            <Unidade>%</Unidade>
          </Campo>
        </Secao>

        <Secao titulo="Avaliação">
          <Campo label="Batimentos cardíacos fetais" alerta={emAlerta.has('bcf')}>
            <input inputMode="numeric" value={bcf} onChange={(e) => setBcf(e.target.value)} aria-label="Batimentos cardíacos fetais" />
            <Unidade>bpm</Unidade>
          </Campo>
          <div style={{ gridColumn: 'span 3' }}>
            <span className="lbl">Dinâmica uterina</span>
            <div style={{ display: 'flex', gap: 7 }} role="radiogroup" aria-label="Dinâmica uterina">
              {(['ausente', 'esparsa', 'presente'] as DinamicaUterina[]).map((v) => (
                <label key={v} className={du === v ? 'pill pill--on' : 'pill'} style={{ flex: '1 1 0' }}>
                  <input type="radio" name="du" checked={du === v} onChange={() => setDu(v)} />
                  {v === 'ausente' ? 'Ausente' : v === 'esparsa' ? 'Esparsa' : 'Presente'}
                </label>
              ))}
            </div>
          </div>
        </Secao>

        <SecaoOpcional
          titulo="Incluir balanço hídrico neste registro"
          ativo={temBalanco}
          onToggle={setTemBalanco}
          rodape="Você digita apenas os volumes: o débito urinário e o balanço são calculados."
        >
          <Campo label="Ingesta via oral">
            <input inputMode="numeric" value={vo} onChange={(e) => setVo(e.target.value)} aria-label="Ingesta via oral" />
            <Unidade>mL</Unidade>
          </Campo>
          <Campo label="Infusão endovenosa">
            <input inputMode="numeric" value={ev} onChange={(e) => setEv(e.target.value)} aria-label="Infusão endovenosa" />
            <Unidade>mL</Unidade>
          </Campo>
          <Campo label="Hidratação / via" span={2}>
            <select value={via} onChange={(e) => setVia(e.target.value)} aria-label="Hidratação e via">
              <option>Via oral livre</option>
              <option>Soro fisiológico 0,9 % — acesso periférico</option>
              <option>Ringer lactato</option>
              <option>Jejum</option>
            </select>
          </Campo>
          <Campo label="Diurese — volume atual">
            <input inputMode="numeric" value={diurese} onChange={(e) => setDiurese(e.target.value)} aria-label="Diurese" />
            <Unidade>mL</Unidade>
          </Campo>
          <Campo label="Outras perdas">
            <input inputMode="numeric" value={perdas} onChange={(e) => setPerdas(e.target.value)} aria-label="Outras perdas" />
            <Unidade>mL</Unidade>
          </Campo>
          <div style={{ gridColumn: 'span 2' }}>
            <span className="lbl">Débito urinário calculado</span>
            <div className="calc">
              {debito ? (
                <>
                  <span
                    style={{
                      fontWeight: 700,
                      color: debito.alerta ? 'var(--alert-text)' : 'var(--ok-text)',
                    }}
                  >
                    {debito.mlPorHora} mL/h
                  </span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>{debito.memoria}</span>
                </>
              ) : (
                <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>
                  {anterior
                    ? 'Informe o volume atual para calcular.'
                    : 'Sem diurese anterior registrada — o débito aparece no próximo controle.'}
                </span>
              )}
            </div>
          </div>
          <div style={{ gridColumn: 'span 4' }}>
            <span className="lbl">
              Balanço do período — desde o último registro
              {situacao.ultimo ? ` (${horaHM(situacao.ultimo.horario)})` : ''}
            </span>
            <div className="calc" style={{ borderColor: 'var(--color-plum-700)', background: 'var(--head-bg)' }}>
              {resultadoBalanco ? (
                <>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-plum-800)' }}>
                    {resultadoBalanco.total >= 0 ? '+' : ''}
                    {resultadoBalanco.total} mL
                  </span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>
                    {resultadoBalanco.memoria}
                  </span>
                </>
              ) : (
                <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>—</span>
              )}
            </div>
          </div>
        </SecaoOpcional>

        <SecaoOpcional
          titulo="Incluir toque vaginal neste registro"
          ativo={temToque}
          onToggle={setTemToque}
          rodape="Dilatação, apagamento e plano de DeLee alimentam o partograma. A dilatação exibida no quadro vem daqui."
        >
          <Campo label="Dilatação do colo" alerta={emAlerta.has('dilatacao')}>
            <input inputMode="numeric" value={dil} onChange={(e) => setDil(e.target.value)} aria-label="Dilatação do colo" />
            <Unidade>cm</Unidade>
          </Campo>
          <Campo label="Apagamento">
            <input inputMode="numeric" value={apag} onChange={(e) => setApag(e.target.value)} aria-label="Apagamento" />
            <Unidade>%</Unidade>
          </Campo>
          <Campo label="Plano de DeLee">
            <select value={delee} onChange={(e) => setDelee(e.target.value)} aria-label="Plano de DeLee">
              {['-3', '-2', '-1', '0', '+1', '+2', '+3'].map((v) => (
                <option key={v} value={v.replace('+', '')}>
                  {v}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Hora da rotura">
            <input
              type="time"
              value={horaRotura}
              onChange={(e) => setHoraRotura(e.target.value)}
              disabled={bolsa !== 'rota'}
              aria-label="Hora da rotura"
            />
          </Campo>
          <div style={{ gridColumn: 'span 2' }}>
            <span className="lbl">Bolsa</span>
            <div style={{ display: 'flex', gap: 7 }} role="radiogroup" aria-label="Bolsa das águas">
              {(['integra', 'rota'] as const).map((v) => (
                <label key={v} className={bolsa === v ? 'pill pill--on' : 'pill'} style={{ flex: '1 1 0' }}>
                  <input type="radio" name="bolsa" checked={bolsa === v} onChange={() => setBolsa(v)} />
                  {v === 'integra' ? 'Íntegra' : 'Rota'}
                </label>
              ))}
            </div>
          </div>
          <Campo label="Cor do líquido" span={2}>
            <select
              value={corLiquido}
              onChange={(e) => setCorLiquido(e.target.value as CorLiquido)}
              disabled={bolsa !== 'rota'}
              aria-label="Cor do líquido"
            >
              {(Object.keys(COR_LIQUIDO_LABEL) as CorLiquido[]).map((k) => (
                <option key={k} value={k}>
                  {COR_LIQUIDO_LABEL[k]}
                </option>
              ))}
            </select>
          </Campo>
        </SecaoOpcional>

        <div>
          <label className="lbl" htmlFor="obs-evolucao">
            Observação da evolução
          </label>
          <textarea
            id="obs-evolucao"
            rows={2}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Opcional — descreva achados, condutas e orientações."
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

      {trocando && (
        <ModalResponsavel
          atual={responsavel}
          onFechar={() => setTrocando(false)}
          onConfirmar={(u) => {
            setResponsavel(u);
            setTrocando(false);
          }}
        />
      )}
    </>
  );
}

/**
 * Trocar o responsável muda só a autoria do registro: a sessão continua sendo
 * a do usuário logado, e a auditoria grava as duas informações.
 */
function ModalResponsavel({
  atual,
  onFechar,
  onConfirmar,
}: {
  atual: Usuario;
  onFechar(): void;
  onConfirmar(u: Usuario): void;
}) {
  const { estado, adicionarUsuario, usuarioAtual } = useApp();
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState(atual.id);
  const [adicionando, setAdicionando] = useState(false);
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState<FuncaoUsuario>('mr1');
  const [registro, setRegistro] = useState('');
  const [salvarCadastro, setSalvarCadastro] = useState(false);

  const lista = estado.usuarios.filter((u) =>
    u.nome.toLowerCase().includes(busca.trim().toLowerCase())
  );

  const confirmar = () => {
    if (adicionando && nome.trim()) {
      const novo: Usuario = {
        id: salvarCadastro ? '' : `avulso_${Date.now()}`,
        nome: nome.trim(),
        funcao,
        registroProfissional: registro.trim() || undefined,
        ativo: true,
      };
      // Desmarcado, o nome vale só para este registro — útil para quem está de
      // passagem pela unidade, sem poluir o cadastro.
      onConfirmar(salvarCadastro ? adicionarUsuario({ ...novo }) : novo);
      return;
    }
    const u = estado.usuarios.find((x) => x.id === selecionado);
    if (u) onConfirmar(u);
  };

  return (
    <Modal
      titulo="Quem está registrando"
      largura={608}
      onFechar={onFechar}
      subtitulo={
        <p style={{ margin: 0, color: 'var(--color-plum-300)', fontSize: 11.5 }}>
          O nome escolhido vai para a auditoria deste registro, junto com o horário.
        </p>
      }
      rodape={
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 9 }}>
          <button type="button" className="btn" onClick={onFechar}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={confirmar}>
            Confirmar responsável
          </button>
        </div>
      }
    >
      <div>
        <h3 className="sec">Profissionais do plantão</h3>
        <div className="field" style={{ marginBottom: 10 }}>
          <label className="sr-only" htmlFor="busca-prof">
            Buscar profissional
          </label>
          <input
            id="busca-prof"
            type="search"
            placeholder="Buscar por nome…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div role="radiogroup" aria-label="Profissional responsável" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {lista.map((u) => {
            const on = !adicionando && selecionado === u.id;
            return (
              <label
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '10px 12px',
                  minHeight: 44,
                  border: `1px solid ${on ? 'var(--color-plum-700)' : 'var(--border)'}`,
                  borderRadius: 10,
                  background: on ? 'var(--head-bg)' : 'var(--surface)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="resp"
                  checked={on}
                  onChange={() => {
                    setSelecionado(u.id);
                    setAdicionando(false);
                  }}
                  style={{ width: 16, height: 16, accentColor: 'var(--color-plum-700)', flex: '0 0 16px', margin: 0 }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    width: 30,
                    height: 30,
                    flex: '0 0 30px',
                    borderRadius: '50%',
                    background: 'var(--color-plum-700)',
                    color: 'var(--color-plum-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10.5,
                    fontWeight: 700,
                  }}
                >
                  {iniciais(u.nome)}
                </span>
                <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>
                    {assinatura(u.funcao, u.nome)}
                  </span>
                  <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: 11.5 }}>
                    {FUNCAO_DESCRICAO[u.funcao]}
                    {u.registroProfissional ? ` · ${u.registroProfissional}` : ''}
                  </span>
                </span>
                {u.id === usuarioAtual.id && (
                  <span style={{ color: 'var(--ok-text)', fontSize: 11, fontWeight: 600 }}>você</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <SecaoOpcional
        titulo="Adicionar outro profissional"
        ativo={adicionando}
        onToggle={setAdicionando}
        colunas={2}
      >
        <Campo label="Nome completo" span={2}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Letícia Prado de Moraes" aria-label="Nome completo" />
        </Campo>
        <Campo label="Função">
          <select value={funcao} onChange={(e) => setFuncao(e.target.value as FuncaoUsuario)} aria-label="Função">
            {FUNCOES.map((f) => (
              <option key={f} value={f}>
                {FUNCAO_LABEL[f]} — {FUNCAO_DESCRICAO[f]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Registro profissional">
          <input value={registro} onChange={(e) => setRegistro(e.target.value)} placeholder="CRM — opcional" aria-label="Registro profissional" />
        </Campo>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={salvarCadastro}
              onChange={(e) => setSalvarCadastro(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: 'var(--color-plum-700)', margin: '2px 0 0', flex: '0 0 15px' }}
            />
            <span style={{ fontSize: 12 }}>
              Salvar no cadastro de usuários
              <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: 11.5, marginTop: 2 }}>
                Desmarcado, o nome vale só para este registro — útil para quem está de
                passagem pela unidade.
              </span>
            </span>
          </label>
        </div>
      </SecaoOpcional>

      <Aviso tom="atencao" titulo="A sessão continua sendo a sua">
        Trocar o responsável muda apenas a autoria deste registro. A auditoria guarda as
        duas informações: quem registrou e de qual conta foi lançado ({usuarioAtual.nome}).
      </Aviso>
    </Modal>
  );
}

export { agoraIso };
