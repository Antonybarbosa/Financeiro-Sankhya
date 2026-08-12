/**
 * Utilitários para visualização de boletos bancários.
 *
 * - Mapa de nome de bancos (CODBCO -> nome)
 * - Formatação da linha digitável (57 dígitos -> grupos)
 * - Geração do código de barras (44 dígitos) no padrão
 *   ITF (Interleaved 2 of 5) como barras para renderização SVG,
 *   sem dependência externa.
 */

export const BANCOS: Record<string, string> = {
  '001': 'Banco do Brasil',
  '003': 'Banco da Amazônia',
  '004': 'Banco do Nordeste',
  '021': 'Banestes',
  '033': 'Santander',
  '041': 'Banrisul',
  '085': 'Cecred',
  '091': 'Unicred',
  '104': 'Caixa Econômica Federal',
  '136': 'Unicred',
  '212': 'Banco Original',
  '237': 'Bradesco',
  '260': 'Nu Pagamentos',
  '290': 'Pagseguro',
  '341': 'Itaú',
  '389': 'Mercantil do Brasil',
  '399': 'HSBC',
  '422': 'Banco Safra',
  '633': 'Banco Rendimento',
  '707': 'Banco Daycoval',
  '746': 'Itaú',
  '748': 'Sicredi',
  '756': 'Sicoob',
};

export function nomeBanco(codigo: string): string {
  const codigoLimpo = (codigo || '').replace(/\D/g, '');
  if (!codigoLimpo) return 'Boleto bancário';
  const pad = codigoLimpo.padStart(3, '0');
  return BANCOS[pad] || `Banco ${pad}`;
}

/**
 * Código do banco com dígito verificador, no formato usado no boleto
 * (ex.: 237-2 Bradesco, 341-7 Itaú, 001-9 Banco do Brasil). Segue a
 * mesma regra do modelo nativo do Sankhya.
 */
export function codigoBancoDv(codigo: string): string {
  const c = (codigo || '').replace(/\D/g, '');
  if (!c) return '';
  const pad = c.padStart(3, '0');
  const dv: Record<string, string> = {
    '001': '9',
    '033': '7',
    '104': '0',
    '237': '2',
    '341': '7',
  };
  return `${pad}-${dv[pad] || '0'}`;
}

/**
 * Formata o nosso número no padrão do boleto nativo:
 * remove o prefixo (3 primeiros dígitos) e separa o último dígito
 * (DV) com hífen. Ex.: "000000109099" -> "00010909-9".
 */
export function formatarNossoNumero(nossoNumero: string): string {
  const n = (nossoNumero || '').trim();
  if (n.length < 4) return n;
  return `${n.slice(3, n.length - 1)}-${n.slice(n.length - 1)}`;
}

/**
 * Formata a linha digitável no padrão canônico de boleto.
 * Aceita tanto a representação de 47 dígitos (formato impresso) quanto
 * a de 57 dígitos, e também o valor já formatado vindo do Sankhya
 * (ex.: "23793.20100  90000.001090  09007.626907  9 18420000102317").
 */
export function formatarLinhaDigitavel(linha: string): string {
  const digito = (linha || '').replace(/\D/g, '');

  // 47 dígitos: campos 5.5 | 5.6 | 5.6 | DV | 14
  if (digito.length === 47) {
    return [
      `${digito.slice(0, 5)}.${digito.slice(5, 10)}`,
      `${digito.slice(10, 15)}.${digito.slice(15, 21)}`,
      `${digito.slice(21, 26)}.${digito.slice(26, 32)}`,
      `${digito.slice(32, 33)} ${digito.slice(33)}`,
    ].join(' ');
  }

  // 57 dígitos: campos 9 | 10 | 10 | 10 | 6 | 12
  if (digito.length === 57) {
    const campos = [
      digito.slice(0, 9),
      digito.slice(9, 19),
      digito.slice(19, 29),
      digito.slice(29, 39),
      digito.slice(39, 47),
      digito.slice(47),
    ];
    return [
      `${campos[0].slice(0, 5)}.${campos[0].slice(5)}`,
      `${campos[1].slice(0, 5)}.${campos[1].slice(5)}`,
      `${campos[2].slice(0, 5)}.${campos[2].slice(5)}`,
      `${campos[3].slice(0, 5)}.${campos[3].slice(5)}`,
      `${campos[4].slice(0, 1)} ${campos[4].slice(1)}`,
      campos[5],
    ].join(' ');
  }

  return linha || '';
}

// Padrões ITF: 5 elementos (barra/espaco), 2 largos (1 = largo, 0 = estreito).
const ITF_PATTERNS: Record<string, number[]> = {
  '0': [0, 0, 1, 1, 0],
  '1': [1, 0, 0, 0, 1],
  '2': [0, 1, 0, 0, 1],
  '3': [1, 1, 0, 0, 0],
  '4': [0, 0, 1, 0, 1],
  '5': [1, 0, 1, 0, 0],
  '6': [0, 1, 1, 0, 0],
  '7': [0, 0, 0, 1, 1],
  '8': [1, 0, 0, 1, 0],
  '9': [0, 1, 0, 1, 0],
};

export interface BarcodeBar {
  x: number;
  w: number;
}

export interface BarcodeResult {
  bars: BarcodeBar[];
  width: number;
}

/**
 * Gera as barras do código de barras de boleto (44 dígitos) no padrão
 * ITF (Interleaved 2 of 5). Barras e espaços são intercalados: o dígito
 * par codifica as barras e o ímpar os espaços.
 */
export function gerarCodigoDeBarras(codigo: string): BarcodeResult {
  const digitos = (codigo || '').replace(/\D/g, '');
  // Se não for par, adiciona um zero à esquerda (segurança)
  const pareados = digitos.length % 2 === 0 ? digitos : `0${digitos}`;

  const narrow = 1;
  const wide = 2.3;
  const elements: { isBar: boolean; w: number }[] = [];

  // Start: barra, espaço, barra, espaço (todos estreitos)
  elements.push(
    { isBar: true, w: narrow },
    { isBar: false, w: narrow },
    { isBar: true, w: narrow },
    { isBar: false, w: narrow },
  );

  for (let i = 0; i < pareados.length; i += 2) {
    const barras = ITF_PATTERNS[pareados[i]] || ITF_PATTERNS['0'];
    const espacos = ITF_PATTERNS[pareados[i + 1]] || ITF_PATTERNS['0'];
    for (let j = 0; j < 5; j++) {
      elements.push({ isBar: true, w: barras[j] ? wide : narrow });
      elements.push({ isBar: false, w: espacos[j] ? wide : narrow });
    }
  }

  // Stop: barra larga, espaço estreito, barra estreita
  elements.push(
    { isBar: true, w: wide },
    { isBar: false, w: narrow },
    { isBar: true, w: narrow },
  );

  let x = 0;
  const bars: BarcodeBar[] = [];
  for (const el of elements) {
    if (el.isBar) bars.push({ x, w: el.w });
    x += el.w;
  }

  return { bars, width: x };
}
