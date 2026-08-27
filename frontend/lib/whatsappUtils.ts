import { formatCurrency, formatDate } from './utils';

export interface TituloParaWhatsApp {
  id: number;
  numero?: number | string | null;
  desdobramento?: string | null;
  dataVencimento: string | Date | null;
  valorEmAberto: number;
  historico?: string | null;
  nossoNumero?: string | null;
  chaveNfe?: string | null;
}

export interface WhatsAppInterpolacaoData {
  nomeParceiro: string;
  primeiroNome?: string;
  titulos: TituloParaWhatsApp[];
  telefone?: string | null;
}

export const TAGS_WHATSAPP = [
  { tag: '{nome_parceiro}', descricao: 'Razão Social / Nome completo do cliente' },
  { tag: '{primeiro_nome}', descricao: 'Primeiro nome do cliente ou contato' },
  { tag: '{valor_total}', descricao: 'Valor total somado dos títulos (ex: R$ 1.500,00)' },
  { tag: '{qtd_titulos}', descricao: 'Quantidade de títulos selecionados (ex: 3)' },
  { tag: '{lista_titulos_detalhada}', descricao: 'Relação em lista dos títulos com Nota, Parcela, Vencimento e Valor' },
  { tag: '{vencimento_mais_antigo}', descricao: 'Data de vencimento do título com maior atraso' },
  { tag: '{data_hoje}', descricao: 'Data atual formatada (DD/MM/AAAA)' },
];

export function extrairPrimeiroNome(nome: string): string {
  if (!nome) return '';
  const limpo = nome.trim().split(' ')[0];
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
}

export function interpolarMensagemWhatsApp(
  templateText: string,
  data: WhatsAppInterpolacaoData
): string {
  if (!templateText) return '';

  const titulos = data.titulos || [];
  const valorTotal = titulos.reduce((acc, t) => acc + (t.valorEmAberto || 0), 0);
  const qtdTitulos = titulos.length;

  // Ordenar por data de vencimento mais antiga
  const titulosOrdenados = [...titulos].sort((a, b) => {
    const dA = a.dataVencimento ? new Date(a.dataVencimento).getTime() : 0;
    const dB = b.dataVencimento ? new Date(b.dataVencimento).getTime() : 0;
    return dA - dB;
  });

  const vencimentoMaisAntigo = titulosOrdenados[0]?.dataVencimento
    ? formatDate(titulosOrdenados[0].dataVencimento)
    : formatDate(new Date());

  // Gerar Lista Detalhada dos Títulos
  const listaDetalhada = titulos.length > 0
    ? titulos
        .map((t, idx) => {
          const numDoc = t.numero ? `Nº ${t.numero}` : `NUFIN ${t.id}`;
          const parcStr = t.desdobramento && t.desdobramento !== '0' ? ` (Parc. ${t.desdobramento})` : '';
          const vencStr = formatDate(t.dataVencimento);
          const vlrStr = formatCurrency(t.valorEmAberto);
          return `${idx + 1}. *${numDoc}${parcStr}* | Venc: ${vencStr} | *${vlrStr}*`;
        })
        .join('\n')
    : 'Nenhum título selecionado';

  const dataHoje = formatDate(new Date());
  const primeiroNome = data.primeiroNome || extrairPrimeiroNome(data.nomeParceiro);

  let textoFormatado = templateText
    .replace(/\{nome_parceiro\}/g, data.nomeParceiro || 'Cliente')
    .replace(/\{primeiro_nome\}/g, primeiroNome || 'Cliente')
    .replace(/\{valor_total\}/g, formatCurrency(valorTotal))
    .replace(/\{qtd_titulos\}/g, String(qtdTitulos))
    .replace(/\{lista_titulos_detalhada\}/g, listaDetalhada)
    .replace(/\{vencimento_mais_antigo\}/g, vencimentoMaisAntigo)
    .replace(/\{data_hoje\}/g, dataHoje);

  return textoFormatado;
}

export function gerarLinkWhatsAppWeb(telefone: string | null | undefined, mensagem: string): string {
  if (!telefone) return '#';
  const apenasNumeros = telefone.replace(/\D/g, '');
  if (!apenasNumeros) return '#';

  // Se o número não começar com código do país (55), adiciona 55 se tiver 10 ou 11 dígitos
  const foneComPais = apenasNumeros.length <= 11 ? `55${apenasNumeros}` : apenasNumeros;
  const textoCodificado = encodeURIComponent(mensagem);

  return `https://wa.me/${foneComPais}?text=${textoCodificado}`;
}
