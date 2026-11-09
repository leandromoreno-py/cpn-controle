import type { ReactNode } from 'react';

export function Campo({
  label,
  children,
  span = 1,
  alerta = false,
  dica,
}: {
  label?: string;
  children: ReactNode;
  span?: number;
  alerta?: boolean;
  dica?: string;
}) {
  return (
    <div style={{ gridColumn: `span ${span}`, minWidth: 0 }}>
      {label && <span className="lbl">{label}</span>}
      <div className={alerta ? 'field field--alert' : 'field'}>{children}</div>
      {dica && (
        <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--text-dim)' }}>{dica}</p>
      )}
    </div>
  );
}

export function Unidade({ children }: { children: ReactNode }) {
  return (
    <span style={{ color: 'var(--text-dim)', fontSize: 11.5, flex: '0 0 auto' }}>
      {children}
    </span>
  );
}

export function Secao({
  titulo,
  children,
  colunas = 4,
}: {
  titulo: string;
  children: ReactNode;
  colunas?: number;
}) {
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
      <legend className="sec">{titulo}</legend>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
          gap: 12,
          alignItems: 'end',
        }}
      >
        {children}
      </div>
    </fieldset>
  );
}

/**
 * Bloco opcional: o checkbox vive na própria legenda do fieldset.
 * Desmarcado, o registro salva sem esses dados — é o que permite registrar
 * uma PA de rotina sem precisar de toque vaginal ou balanço hídrico.
 */
export function SecaoOpcional({
  titulo,
  ativo,
  onToggle,
  children,
  rodape,
  colunas = 4,
}: {
  titulo: string;
  ativo: boolean;
  onToggle(v: boolean): void;
  children: ReactNode;
  rodape?: string;
  colunas?: number;
}) {
  return (
    <fieldset
      style={{
        border: '1px solid var(--border)',
        borderRadius: 11,
        margin: 0,
        padding: '14px 16px',
        background: 'var(--app-bg)',
      }}
    >
      <legend style={{ padding: '0 6px', marginLeft: -6 }}>
        <label className="sec" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => onToggle(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: 'var(--color-plum-700)', margin: 0 }}
          />
          {titulo}
        </label>
      </legend>
      {ativo && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
              gap: 12,
              alignItems: 'end',
            }}
          >
            {children}
          </div>
          {rodape && (
            <p style={{ margin: '11px 0 0', color: 'var(--text-dim)', fontSize: 11.5 }}>
              {rodape}
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}

export function Modal({
  titulo,
  subtitulo,
  largura = 860,
  onFechar,
  children,
  rodape,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  largura?: number;
  onFechar(): void;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <div
      role="presentation"
      onClick={onFechar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(42,10,61,0.55)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '28px 20px',
        overflowY: 'auto',
        zIndex: 50,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: largura,
          background: 'var(--surface)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(42,10,61,0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            background: 'var(--color-plum-950)',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: 17, fontWeight: 700 }}>{titulo}</h2>
            {subtitulo && <div style={{ marginTop: 7 }}>{subtitulo}</div>}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{
              width: 36,
              height: 36,
              flex: '0 0 36px',
              borderRadius: 9,
              border: '1px solid var(--color-plum-800)',
              background: 'transparent',
              color: 'var(--color-plum-200)',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </header>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {children}
        </div>
        {rodape && (
          <footer
            style={{
              padding: '15px 22px',
              borderTop: '1px solid var(--border)',
              background: 'var(--app-bg)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {rodape}
          </footer>
        )}
      </div>
    </div>
  );
}

export function Aviso({
  tom,
  titulo,
  children,
}: {
  tom: 'alerta' | 'atencao';
  titulo: string;
  children?: ReactNode;
}) {
  const cor = tom === 'alerta' ? 'var(--color-late)' : 'var(--color-warn)';
  const texto = tom === 'alerta' ? 'var(--alert-text)' : 'var(--warn-text)';
  const fundo =
    tom === 'alerta' ? 'var(--alert-soft)' : 'rgba(232,163,60,0.11)';
  return (
    <div
      style={{
        padding: '11px 13px',
        border: `1px solid ${cor}`,
        borderLeftWidth: 4,
        borderRadius: 9,
        background: fundo,
      }}
    >
      <strong style={{ color: texto, fontSize: 12.5 }}>{titulo}</strong>
      {children && (
        <div style={{ color: texto, fontSize: 12, marginTop: 2 }}>{children}</div>
      )}
    </div>
  );
}

export function Chip({
  children,
  bg,
  cor,
  borda,
  peso = 600,
}: {
  children: ReactNode;
  bg?: string;
  cor?: string;
  borda?: string;
  peso?: number;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: 20,
        background: bg ?? 'var(--tag-bg)',
        border: `1px solid ${borda ?? 'var(--border)'}`,
        color: cor ?? 'var(--text)',
        fontSize: 11,
        fontWeight: peso,
        lineHeight: 1.6,
      }}
    >
      {children}
    </span>
  );
}
