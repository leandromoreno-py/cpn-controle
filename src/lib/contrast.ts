// Ajuste automático de luminância.
//
// As cores das categorias são editáveis pelo admin, então nenhuma escolha dele
// pode produzir uma linha ilegível: aproximamos a cor do branco (tema escuro)
// ou do preto (tema claro) até atingir o contraste mínimo contra o fundo.
// Alvos: 4,5:1 para texto (WCAG AA) e 3:1 para a barra da categoria.

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  let s = (hex || '#000000').replace('#', '').trim();
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = (i: number) => parseInt(s.slice(i, i + 2), 16) || 0;
  return [n(0), n(2), n(4)];
}

export function rgbToHex(rgb: RGB): string {
  return (
    '#' +
    rgb
      .map((v) => {
        const n = Math.max(0, Math.min(255, Math.round(v)));
        return (n < 16 ? '0' : '') + n.toString(16);
      })
      .join('')
  );
}

export function luminance(rgb: RGB): number {
  const [r, g, b] = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  }) as RGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Aproxima `cor` até atingir `alvo` de contraste contra `fundo`. */
export function adaptar(cor: string, fundo: string, alvo: number): string {
  const bg = hexToRgb(fundo);
  let rgb = hexToRgb(cor);
  const paraBranco = luminance(bg) < 0.4;
  for (let i = 0; i < 24 && contrastRatio(rgb, bg) < alvo; i++) {
    rgb = rgb.map((v) =>
      paraBranco ? v + (255 - v) * 0.12 : v * 0.88
    ) as RGB;
  }
  return rgbToHex(rgb);
}

export function rgba(cor: string, pct: number): string {
  const [r, g, b] = hexToRgb(cor);
  return `rgba(${r},${g},${b},${pct / 100})`;
}

/** Mistura `fg` sobre `bg` com a opacidade dada — para medir contraste real. */
export function mistura(fg: string, bg: string, pct: number): RGB {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  const a = pct / 100;
  return [0, 1, 2].map((i) => f[i] * a + b[i] * (1 - a)) as RGB;
}

/** A mesma mistura, já em hex — serve de fundo para medir contraste de texto. */
export function misturaHex(fg: string, bg: string, pct: number): string {
  return rgbToHex(mistura(fg, bg, pct));
}

export interface EstiloCategoria {
  barra: string;
  texto: string;
  chipBg: string;
  linhaBg: string;
  contrasteTexto: number;
}

/** Tokens visuais de uma categoria, já corrigidos para o tema atual. */
export function estiloCategoria(
  cor: string,
  superficie: string,
  tingimentoPct = 9,
  temaEscuro = false
): EstiloCategoria {
  const chipPct = tingimentoPct + (temaEscuro ? 8 : 3);
  // O texto do chip fica sobre o FUNDO TINGIDO, não sobre a superfície: medir
  // contra o branco deixava passar combinações que falhavam por pouco
  // (o azul #2563EB parava em 4,37:1).
  const fundoDoChip = misturaHex(cor, superficie, chipPct);
  const texto = adaptar(cor, fundoDoChip, 4.5);
  return {
    barra: adaptar(cor, superficie, 3),
    texto,
    chipBg: rgba(cor, chipPct),
    linhaBg: rgba(cor, tingimentoPct),
    contrasteTexto: contrastRatio(hexToRgb(texto), hexToRgb(fundoDoChip)),
  };
}
