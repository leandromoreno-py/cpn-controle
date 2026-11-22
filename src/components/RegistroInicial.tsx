import { useState, type FormEvent } from 'react';
import { useApp } from '../state/store';
import { Modal } from './ui';
import { assinatura, dataHoraPorExtenso, agoraIso } from '../lib/calc';
import { FUNCAO_DESCRICAO, FUNCAO_LABEL, FUNCOES, type FuncaoUsuario } from '../types';

/**
 * Registro inicial: quem está no quadro escolhe a função entre as cinco fixas e
 * diz o nome. Nada é anônimo — toda alteração passa a ser assinada por
 * "MR1 Fulano de Tal às 14:32 do dia 22/11/2026".
 *
 * Com `onFechar`, a mesma tela serve para trocar de pessoa no meio do plantão,
 * dentro de um modal. Sem ele, é a porta de entrada do app em modo local.
 */
export function RegistroInicial({ onFechar }: { onFechar?: () => void }) {
  const { registrarIdentidade, usuarioAtual, estado, precisaRegistro } = useApp();
  const trocando = onFechar != null;
  const [funcao, setFuncao] = useState<FuncaoUsuario>(
    trocando && !precisaRegistro ? usuarioAtual.funcao : 'mr1'
  );
  const [nome, setNome] = useState(trocando && !precisaRegistro ? usuarioAtual.nome : '');
  const limpo = nome.trim().replace(/\s+/g, ' ');
  // Nome já cadastrado: é a mesma pessoa voltando, não um cadastro novo.
  const conhecido = estado.usuarios.find((u) => u.nome.toLowerCase() === limpo.toLowerCase());

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!limpo) return;
    registrarIdentidade(funcao, limpo);
    onFechar?.();
  };

  const corpo = (
    <>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="lbl" style={{ padding: 0, marginBottom: 8 }}>
          Função
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FUNCOES.map((f) => {
            const ativo = f === funcao;
            return (
              <label
                key={f}
                title={FUNCAO_DESCRICAO[f]}
                style={{
                  flex: '1 1 110px',
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '0 12px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  // Selecionado tem fundo E borda grossa: num posto de
                  // enfermagem a cor sozinha não pode dizer o que está marcado.
                  border: ativo
                    ? '2px solid var(--color-plum-600)'
                    : '1px solid var(--border)',
                  background: ativo ? 'var(--color-plum-100)' : 'var(--surface)',
                  color: ativo ? 'var(--color-plum-800)' : 'var(--text)',
                }}
              >
                <input
                  type="radio"
                  name="funcao-inicial"
                  value={f}
                  checked={ativo}
                  onChange={() => setFuncao(f)}
                  style={{
                    width: 16,
                    height: 16,
                    flex: '0 0 16px',
                    margin: 0,
                    accentColor: 'var(--color-plum-700)',
                  }}
                />
                {FUNCAO_LABEL[f]}
              </label>
            );
          })}
        </div>
        <p style={{ margin: '8px 0 0', color: 'var(--text-dim)', fontSize: 12 }}>
          {FUNCAO_DESCRICAO[funcao]}
        </p>
      </fieldset>

      <div>
        <label className="lbl" htmlFor="registro-nome">
          Nome
        </label>
        <div className="field">
          <input
            id="registro-nome"
            autoFocus
            autoComplete="name"
            placeholder="Ex.: Fulano de Tal"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        {conhecido && conhecido.funcao !== funcao && (
          <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: 11.5 }}>
            Esse nome já está no quadro como {FUNCAO_LABEL[conhecido.funcao]}. A função será
            atualizada; o que já foi registrado antes continua assinado como estava.
          </p>
        )}
      </div>

      <div
        style={{
          padding: '10px 12px',
          borderRadius: 9,
          background: 'var(--head-bg)',
          border: '1px solid var(--border)',
          fontSize: 12.5,
          lineHeight: 1.5,
        }}
      >
        <span style={{ color: 'var(--text-dim)' }}>Suas alterações ficarão assinadas como</span>
        <br />
        <strong>
          {assinatura(funcao, limpo || 'Fulano de Tal')} {dataHoraPorExtenso(agoraIso())}
        </strong>
      </div>
    </>
  );

  const botao = (
    <button
      type="submit"
      className="btn btn--primary"
      style={{ height: 44, minWidth: 160 }}
      disabled={!limpo}
    >
      {trocando ? 'Trocar' : 'Entrar no quadro'}
    </button>
  );

  if (trocando) {
    return (
      <Modal
        titulo="Quem está registrando"
        subtitulo="A função e o nome aparecem em cada alteração do quadro."
        largura={520}
        onFechar={onFechar!}
      >
        <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {corpo}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" style={{ height: 44 }} onClick={onFechar}>
              Cancelar
            </button>
            {botao}
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'var(--color-plum-950)',
      }}
    >
      <form
        onSubmit={enviar}
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--surface)',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              flex: '0 0 38px',
              borderRadius: 10,
              background: 'var(--color-gold)',
              color: 'var(--color-plum-950)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            ♥
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>CPN Controle</h1>
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 12 }}>
              Centro de Parto Normal
            </p>
          </div>
        </div>

        {corpo}
        {botao}

        <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 11.5, lineHeight: 1.55 }}>
          Ambiente de demonstração, sem dados reais de paciente. A identificação fica salva
          neste navegador e pode ser trocada na barra superior.
        </p>
      </form>
    </div>
  );
}
