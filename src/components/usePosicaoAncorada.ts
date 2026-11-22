import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export interface Posicao {
  top: number;
  left: number;
}

const MARGEM = 8;

/**
 * Posiciona um painel na tela a partir do botão que o abriu.
 *
 * Painéis `absolute` dentro das linhas eram cortados pelo contêiner da tabela,
 * que tem overflow hidden para arredondar os cantos. Ancorando na viewport
 * eles escapam de qualquer recorte: abrem abaixo do botão; se não couber,
 * acima; se não couber nem acima, encostam na borda e rolam por dentro.
 */
export function usePosicaoAncorada(
  ancora: HTMLElement | null,
  alinhamento: 'esquerda' | 'direita' = 'esquerda',
  recalcular: unknown = null
): [RefObject<HTMLDivElement>, Posicao | null] {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Posicao | null>(null);

  useLayoutEffect(() => {
    const posicionar = () => {
      const a = ancora?.getBoundingClientRect();
      if (!a) return;
      const el = ref.current;
      const largura = el?.offsetWidth ?? 240;
      const altura = el?.offsetHeight ?? 300;

      const bruto = alinhamento === 'direita' ? a.right - largura : a.left;
      const left = Math.min(
        Math.max(MARGEM, bruto),
        Math.max(MARGEM, window.innerWidth - largura - MARGEM)
      );

      let top = a.bottom + 6;
      if (top + altura + MARGEM > window.innerHeight) {
        const acima = a.top - altura - 6;
        top = acima >= MARGEM ? acima : Math.max(MARGEM, window.innerHeight - altura - MARGEM);
      }
      setPos({ top, left });
    };

    posicionar();
    // `true` para capturar a rolagem de qualquer contêiner, não só da janela.
    window.addEventListener('scroll', posicionar, true);
    window.addEventListener('resize', posicionar);
    return () => {
      window.removeEventListener('scroll', posicionar, true);
      window.removeEventListener('resize', posicionar);
    };
  }, [ancora, alinhamento, recalcular]);

  return [ref, pos];
}

/** Estilo comum dos painéis ancorados. */
export function estiloPainel(pos: Posicao | null, largura: number): React.CSSProperties {
  return {
    position: 'fixed',
    top: pos?.top ?? -9999,
    left: pos?.left ?? -9999,
    zIndex: 71,
    width: largura,
    maxHeight: `calc(100vh - ${MARGEM * 2}px)`,
    overflowY: 'auto',
    visibility: pos ? 'visible' : 'hidden',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 11,
    boxShadow: '0 14px 36px rgba(42,10,61,0.26)',
    textAlign: 'left',
    cursor: 'default',
  };
}
