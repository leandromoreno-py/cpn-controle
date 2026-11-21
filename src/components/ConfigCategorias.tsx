import { useState } from 'react';
import { useApp } from '../state/store';
import { estiloCategoria } from '../lib/contrast';
import { Aviso } from './ui';
import { novoId } from '../lib/calc';

/**
 * Cores editáveis com correção automática: o admin escolhe qualquer hex e o app
 * ajusta a luminância do texto e da barra até passar o contraste mínimo.
 * A prévia ao lado mostra o resultado antes de salvar.
 */
export function ConfigCategorias() {
  const { estado, tema, salvarCategoria, restaurarCoresPadrao } = useApp();
  const superficie = tema === 'escuro' ? '#1E1228' : '#FFFFFF';
  const [nova, setNova] = useState('');

  return (
    <div style={{ padding: '20px 24px 36px', maxWidth: 980 }}>
      <header style={{ marginBottom: 18 }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 11.5, marginBottom: 4 }}>
          Configurações › Categorias
        </div>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: -0.3 }}>
          Categorias e cores
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: 12.5, maxWidth: 640 }}>
          A cor identifica a categoria na borda esquerda da linha, no chip e no fundo
          tingido a 9 %. A linha nunca é preenchida com a cor saturada: isso derrubaria o
          contraste do texto e esconderia os alertas clínicos.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {estado.categorias.map((c) => {
          const e = estiloCategoria(c.cor, superficie, 9, tema === 'escuro');
          const passa = e.contrasteTexto >= 4.5;
          return (
            <section
              key={c.id}
              className="card"
              style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}
            >
              <div style={{ flex: '0 0 190px' }}>
                <label className="lbl" htmlFor={`nome-${c.id}`}>
                  Nome
                </label>
                <div className="field">
                  <input
                    id={`nome-${c.id}`}
                    value={c.nome}
                    onChange={(ev) => salvarCategoria({ ...c, nome: ev.target.value })}
                  />
                </div>
                {c.descricao && (
                  <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--text-dim)' }}>
                    {c.descricao}
                  </p>
                )}
              </div>

              <div style={{ flex: '0 0 170px' }}>
                <label className="lbl" htmlFor={`cor-${c.id}`}>
                  Cor
                </label>
                <div className="field" style={{ gap: 9 }}>
                  <input
                    id={`cor-${c.id}`}
                    type="color"
                    value={c.cor}
                    onChange={(ev) => salvarCategoria({ ...c, cor: ev.target.value })}
                    style={{ width: 30, height: 24, padding: 0, border: 0, background: 'none', flex: '0 0 30px' }}
                  />
                  <input
                    value={c.cor.toUpperCase()}
                    onChange={(ev) => salvarCategoria({ ...c, cor: ev.target.value })}
                    aria-label={`Hexadecimal da cor de ${c.nome}`}
                  />
                </div>
              </div>

              {/* PRÉVIA DA LINHA */}
              <div style={{ flex: '1 1 300px', minWidth: 260 }}>
                <span className="lbl">Prévia da linha no quadro</span>
                <div
                  style={{
                    background: e.linhaBg,
                    borderLeft: `5px solid ${e.barra}`,
                    borderRadius: '0 9px 9px 0',
                    padding: '11px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 38,
                      height: 26,
                      padding: '0 9px',
                      borderRadius: 7,
                      background: e.chipBg,
                      border: `1px solid ${e.barra}`,
                      color: e.texto,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    A
                  </span>
                  <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 13.5 }}>
                      Maria Clara S. Nunes
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
                      <span
                        style={{
                          padding: '1px 8px',
                          borderRadius: 20,
                          background: e.chipBg,
                          color: e.texto,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {c.nome}
                      </span>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>G2P1A0 · 39s2d</span>
                    </span>
                  </span>
                </div>
              </div>

              <div style={{ flex: '0 0 110px', textAlign: 'right' }}>
                <span className="lbl">Contraste</span>
                <strong
                  style={{
                    fontSize: 13,
                    color: passa ? 'var(--ok-text)' : 'var(--alert-text)',
                  }}
                >
                  {e.contrasteTexto.toFixed(1).replace('.', ',')}:1
                </strong>
                <div style={{ color: 'var(--text-dim)', fontSize: 10.5, marginTop: 2 }}>
                  {passa ? 'passa AA' : 'corrigido'}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18, alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 260px', maxWidth: 320 }}>
          <label className="lbl" htmlFor="nova-cat">
            Nova categoria
          </label>
          <div className="field">
            <input
              id="nova-cat"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              placeholder="Ex.: Observação clínica"
            />
          </div>
        </div>
        <button
          type="button"
          className="btn"
          disabled={nova.trim() === ''}
          onClick={() => {
            salvarCategoria({
              id: novoId('cat'),
              nome: nova.trim(),
              cor: '#7A32A3',
              ordem: estado.categorias.length + 1,
              padrao: false,
            });
            setNova('');
          }}
        >
          Criar categoria
        </button>
        <button type="button" className="btn" onClick={restaurarCoresPadrao}>
          Restaurar cores padrão
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <Aviso tom="atencao" titulo="Os alertas têm escala própria, sem vermelho">
          O vermelho pertence à categoria puérpera. Atraso de controle e alerta clínico usam
          verde, âmbar e laranja, sempre acompanhados de ícone ou rótulo — assim ninguém
          confunde “linha carmim” com “controle atrasado”.
        </Aviso>
      </div>
    </div>
  );
}
