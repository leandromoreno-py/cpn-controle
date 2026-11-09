import { useApp } from '../state/store';

export type Pagina =
  | 'quadro'
  | 'exames'
  | 'leitos'
  | 'categorias'
  | 'arquivadas'
  | 'auditoria';

const ITENS: { id: Pagina; nome: string }[] = [
  { id: 'quadro', nome: 'Quadro de Pacientes' },
  { id: 'exames', nome: 'Exames e Programações' },
  { id: 'arquivadas', nome: 'Arquivadas' },
  { id: 'leitos', nome: 'Configurações › Leitos' },
  { id: 'categorias', nome: 'Configurações › Categorias' },
  { id: 'auditoria', nome: 'Histórico de alterações' },
];

export function Sidebar({
  pagina,
  irPara,
}: {
  pagina: Pagina;
  irPara(p: Pagina): void;
}) {
  const { estado, usuarioAtual } = useApp();
  const pendentes = estado.exames.filter((e) => !e.realizado).length;

  return (
    <nav
      aria-label="Navegação principal"
      style={{
        flex: '0 0 236px',
        width: 236,
        background: 'var(--color-plum-950)',
        padding: '20px 14px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px' }}>
        <div
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            flex: '0 0 32px',
            borderRadius: 9,
            background: 'var(--color-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-plum-950)',
            fontWeight: 700,
          }}
        >
          ♥
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
            CPN Controle
          </div>
          <div style={{ color: 'var(--color-plum-300)', fontSize: 11 }}>
            Centro de Parto Normal
          </div>
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {ITENS.map((item) => {
          const ativo = item.id === pagina;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => irPara(item.id)}
                aria-current={ativo ? 'page' : undefined}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '10px 12px',
                  minHeight: 44,
                  borderRadius: 9,
                  border: 0,
                  cursor: 'pointer',
                  background: ativo ? 'var(--color-plum-800)' : 'transparent',
                  color: ativo ? '#fff' : 'var(--color-plum-200)',
                  fontWeight: ativo ? 600 : 400,
                }}
              >
                <span>{item.nome}</span>
                {item.id === 'exames' && pendentes > 0 && (
                  <span
                    style={{
                      background: 'var(--color-gold)',
                      color: 'var(--color-plum-950)',
                      borderRadius: 20,
                      padding: '1px 7px',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {pendentes}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--color-plum-800)',
          paddingTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
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
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {iniciais(usuarioAtual.nome)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {usuarioAtual.nome}
          </div>
          <div style={{ color: 'var(--color-plum-300)', fontSize: 11 }}>
            {usuarioAtual.registroProfissional ?? 'Plantão'}
          </div>
        </div>
      </div>
    </nav>
  );
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const a = partes[0]?.[0] ?? '';
  const b = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (a + b).toUpperCase();
}
