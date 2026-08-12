'use client';

import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useBoleto } from '@/hooks/useCobranca';
import { Boleto } from '@/types/cobranca';
import { formatCurrency, formatDate, formatCnpjCpf } from '@/lib/utils';
import {
  nomeBanco,
  codigoBancoDv,
  formatarLinhaDigitavel,
  gerarCodigoDeBarras,
} from '@/lib/boleto';
import { Dialog } from '@/components/ui/dialog';
import { Loader2, Copy, Printer, X, AlertTriangle } from 'lucide-react';

interface BoletoViewerProps {
  tituloId: number | null;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/* Estilos do boleto (inline p/ funcionar também na impressão)         */
/* Réplica do modelo nativo do Sankhya "Boleto_Bradesco.jrxml":        */
/* preto no branco, SansSerif, coluna principal 430 / coluna de        */
/* totais 95 (81,9/18,1), título "RECIBO DO SACADO", célula "Esp.Doc." */
/* sem borda, bloco do pagador em caixa única com "Sacador/Avalista",  */
/* instruções com multa/juros em valor e inclusão no SPC.              */
/* ------------------------------------------------------------------ */

const borda = '1px solid #111827';

const lbl: React.CSSProperties = {
  fontSize: 8,
  fontWeight: 700,
  color: '#111827',
  letterSpacing: 0.3,
  marginBottom: 1,
};

const val: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#111827',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const cell: React.CSSProperties = {
  boxSizing: 'border-box',
  border: borda,
  padding: '2px 6px',
  verticalAlign: 'top',
};

// Taxas fixas do modelo nativo: multa de 2% e juros de 7,5% a.m.
// (juros diário = 7,5% / 30) sobre o valor do documento.
const TAXA_MULTA = 0.02;
const TAXA_JUROS_MENSAL = 0.075;

const fmtValor = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata valor como no nativo (#,##0.00), sem símbolo de moeda. */
function formatarValor(v: number): string {
  return fmtValor.format(v);
}

function calcularTotais(boleto: Boleto) {
  const multaR = boleto.valor * TAXA_MULTA;
  const jurosDia = (boleto.valor * TAXA_JUROS_MENSAL) / 30;
  const moraMulta = multaR + jurosDia;
  const desconto = boleto.desconto || 0;
  return { multaR, jurosDia, moraMulta, desconto, valorCobrado: boleto.valor - desconto + moraMulta };
}

/** Instruções idênticas ao modelo Bradesco nativo. */
function gerarInstrucoes(boleto: Boleto): string[] {
  const { multaR, jurosDia } = calcularTotais(boleto);
  return [
    'Instruções (Todas as informações deste boleto são de exclusiva responsabilidade do cedente)',
    `APÓS VENCIMENTO COBRAR MULTA DE ${formatCurrency(multaR)}.`,
    `APÓS VENCIMENTO COBRAR JUROS DE ${formatCurrency(jurosDia)} POR DIA DE ATRASO.`,
    'INCLUSAO NO SPC E ENVIO AO CARTORIO NO 10º DIA DE VENCIDO.',
  ];
}

/** Carteira com 2 dígitos, como o modelo nativo (9 -> 09). */
function formatarCarteira(boleto: Boleto): string {
  const c = (boleto.carteira || '').replace(/\s/g, '');
  if (!c) return '';
  return c.length === 1 ? `0${c}` : c;
}

/** Nosso número no formato do modelo: carteira/NOSSONUM[:-1]-DV (sem cortar prefixo). */
function formatarNossoNumeroBradesco(boleto: Boleto): string {
  const n = (boleto.nossoNumero || '').trim();
  const numero = n.length >= 2 ? `${n.slice(0, -1)}-${n.slice(-1)}` : n;
  return [formatarCarteira(boleto), numero].filter(Boolean).join('/');
}

/** Agência/Conta como no modelo: CODAGE + "/" + número da conta. */
function formatarAgenciaConta(boleto: Boleto): string {
  return [boleto.agencia, boleto.convenio].filter(Boolean).join('/') || '—';
}

function dataHoje(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/* ------------------------------------------------------------------ */
/* Componentes do boleto (presentacionais, sem hooks)                  */
/* ------------------------------------------------------------------ */

function BarcodeSvg({ codigo }: { codigo: string }) {
  const { bars, width } = gerarCodigoDeBarras(codigo);
  return (
    <svg viewBox={`0 0 ${width} 46`} width="100%" height="46" preserveAspectRatio="none" role="img" aria-label="Código de barras">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={46} fill="#000" />
      ))}
    </svg>
  );
}

/** Espaço do logotipo do banco (o nativo usa a imagem logos/bradesco.jpg). */
function LogoBanco({ boleto }: { boleto: Boleto }) {
  const nome = nomeBanco(boleto.codigoBanco);
  const iniciais =
    nome
      .replace(/[^A-Za-zÀ-ÿ ]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0])
      .join('') || nome.slice(0, 2);
  return (
    <div
      style={{
        flexShrink: 0,
        width: 78,
        height: 42,
        border: borda,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1, color: '#111827' }}>
        {iniciais.toUpperCase()}
      </span>
    </div>
  );
}

/**
 * Cabeçalho como no jrxml: logotipo, nome do banco, |237-2| e, à direita,
 * a linha digitável (ficha) ou o título "RECIBO DO SACADO" (recibo).
 */
function TopoBanco({ boleto, variante }: { boleto: Boleto; variante: 'recibo' | 'ficha' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 4px 7px' }}>
      <LogoBanco boleto={boleto} />
      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#111827', whiteSpace: 'nowrap' }}>
        {nomeBanco(boleto.codigoBanco).toUpperCase()}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>
        |{codigoBancoDv(boleto.codigoBanco) || '?'}|
      </div>
      {variante === 'ficha' ? (
        <div
          style={{
            marginLeft: 'auto',
            fontSize: 9.5,
            letterSpacing: 0.8,
            color: '#111827',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {formatarLinhaDigitavel(boleto.linhaDigitavel)}
        </div>
      ) : (
        <div
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.5,
            color: '#111827',
            whiteSpace: 'nowrap',
          }}
        >
          RECIBO DO SACADO
        </div>
      )}
    </div>
  );
}

/** Célula padrão da grade: label + valor. */
function Cell({
  label,
  children,
  style,
  semBorda,
  labelStyle,
  valorStyle,
}: {
  label?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  semBorda?: boolean;
  labelStyle?: React.CSSProperties;
  valorStyle?: React.CSSProperties;
}) {
  return (
    <td style={{ ...cell, ...(semBorda ? { border: 'none' } : {}), ...style }}>
      {label != null && <div style={{ ...lbl, ...labelStyle }}>{label}</div>}
      <div style={{ ...val, ...valorStyle }}>{children ?? ''}</div>
    </td>
  );
}

/** Linha da coluna de totais. */
function LinhaTotais({
  label,
  valor,
  destaque,
  primeira,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
  primeira?: boolean;
}) {
  return (
    <div
      style={{
        border: borda,
        borderTop: primeira ? borda : 'none',
        padding: '2px 6px',
        fontSize: 8.5,
        color: '#111827',
        ...(destaque ? { fontWeight: 700 } : {}),
      }}
    >
      <div
        style={{
          fontWeight: 700,
          letterSpacing: 0.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 800,
          color: '#111827',
          marginTop: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {valor}
      </div>
    </div>
  );
}

/**
 * Bloco do pagador do modelo: caixa única com nome, endereço,
 * CEP-cidade-UF e a linha "Sacador/Avalista" (fonte pequena).
 */
function BlocoPagador({ boleto }: { boleto: Boleto }) {
  const linhas = [`Pagador ${boleto.sacado.nome.toUpperCase()}`];
  if (boleto.sacado.endereco) linhas.push(boleto.sacado.endereco.toUpperCase());
  const cepCidUf = [boleto.sacado.cep, boleto.sacado.cidade, boleto.sacado.uf]
    .filter(Boolean)
    .join(' - ')
    .toUpperCase();
  if (cepCidUf) linhas.push(cepCidUf);
  linhas.push('Sacador/Avalista');

  return (
    <div style={{ border: borda, marginTop: -1, padding: '3px 6px', fontSize: 8.5, color: '#111827', lineHeight: 1.6 }}>
      {linhas.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

function FichaBoleto({ boleto, variante }: { boleto: Boleto; variante: 'recibo' | 'ficha' }) {
  const instrucoes = gerarInstrucoes(boleto);
  const { moraMulta, desconto, valorCobrado } = calcularTotais(boleto);

  const enderecoCedente = [
    boleto.cedente.endereco,
    [boleto.cedente.cidade, boleto.cedente.uf].filter(Boolean).join('/'),
    boleto.cedente.cep ? `CEP: ${boleto.cedente.cep}` : '',
  ]
    .filter(Boolean)
    .join(' - ');

  // Número do documento com 6 dígitos + desdobramento (como no jrxml).
  const numDoc = boleto.numeroDocumento.split('/')[0].padStart(6, '0');
  const numDocCompleto = boleto.desdobramento ? `${numDoc} - ${boleto.desdobramento}` : numDoc;

  const cnpjCedente = formatCnpjCpf(boleto.cedente.cnpjCpf);

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#111827' }}>
      <TopoBanco boleto={boleto} variante={variante} />

      {/* Recibo: coluna esquerda (célula vazia + Beneficiário) e direita
          (Vencimento + Agência/Conta) — como no jrxml (y=28 a 76). */}
      {variante === 'recibo' && (
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <div style={{ width: '81.9%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ border: borda, borderRight: 'none', height: 14 }} />
            <div style={{ border: borda, borderRight: 'none', borderTop: 'none', padding: '3px 6px', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={lbl}>Beneficiário</span>
                <span style={lbl}>CNPJ/CPF</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={val}>{boleto.cedente.nome}</span>
                <span style={val}>{cnpjCedente}</span>
              </div>
              {enderecoCedente && (
                <div style={{ fontSize: 9.5, color: '#374151', marginTop: 3, whiteSpace: 'normal' }}>
                  {enderecoCedente.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div style={{ width: '18.1%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...cell, flexShrink: 0 }}>
              <div style={{ ...lbl, fontSize: 7.5 }}>Vencimento:</div>
              <div style={{ ...val, textAlign: 'right', fontWeight: 700 }}>{formatDate(boleto.dataVencimento)}</div>
            </div>
            <div style={{ ...cell, borderTop: 'none', flex: 1 }}>
              <div style={{ ...lbl, fontSize: 7.5 }}>Agência/Conta</div>
              <div style={val}>{formatarAgenciaConta(boleto)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Ficha: Local do Pagamento + Beneficiário (sem a célula vazia). */}
      {variante === 'ficha' && (
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: '81.9%' }}>
                <div style={lbl}>Local do Pagamento:</div>
                <div style={{ fontSize: 9.5, fontWeight: 500, color: '#374151', whiteSpace: 'normal' }}>
                  Pagável preferencialmente no {nomeBanco(boleto.codigoBanco)}.
                </div>
              </td>
              <td style={{ ...cell, width: '18.1%' }}>
                <div style={{ ...lbl, fontSize: 7.5 }}>Vencimento:</div>
                <div style={{ ...val, textAlign: 'right', fontWeight: 700 }}>{formatDate(boleto.dataVencimento)}</div>
              </td>
            </tr>
            <tr>
              <td style={{ ...cell, width: '81.9%' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={lbl}>Beneficiário:</span>
                  <span style={val}>{boleto.cedente.nome}</span>
                  <span style={{ ...lbl, marginLeft: 'auto' }}>CNPJ/CPF:</span>
                  <span style={val}>{cnpjCedente}</span>
                </div>
                {enderecoCedente && (
                  <div style={{ fontSize: 9.5, color: '#374151', marginTop: 2, whiteSpace: 'normal' }}>
                    {enderecoCedente.toUpperCase()}
                  </div>
                )}
              </td>
              <td style={{ ...cell, width: '18.1%' }}>
                <div style={{ ...lbl, fontSize: 7.5 }}>Agência/Conta</div>
                <div style={val}>{formatarAgenciaConta(boleto)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Linha de dados: no jrxml a célula "Esp.Doc." não tem retângulo (sem borda). */}
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', marginTop: -1 }}>
        <tbody>
          <tr>
            <Cell label="Data do Documento" style={{ width: '20.5%' }}>
              {formatDate(boleto.dataEmissao)}
            </Cell>
            <Cell label="Número do Documento" style={{ width: '20.5%' }}>
              {numDocCompleto}
            </Cell>
            <Cell label="Esp.Doc." semBorda style={{ width: '17.2%' }}>
              DM
            </Cell>
            <Cell label="Aceite" style={{ width: '6.1%' }}>
              N
            </Cell>
            <Cell label="Data Processamento" style={{ width: '17.5%' }}>
              {dataHoje()}
            </Cell>
            <Cell label="Nosso Número" style={{ width: '18.2%' }} valorStyle={{ fontSize: 10 }}>
              {formatarNossoNumeroBradesco(boleto)}
            </Cell>
          </tr>
        </tbody>
      </table>

      {/* Uso do Banco / Carteira / Espécie / Quantidade / Valor + (=) Valor do Documento */}
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', marginTop: -1 }}>
        <tbody>
          <tr>
            <Cell label="Uso do Banco" style={{ width: '20.5%' }}>
              {' '}
            </Cell>
            <Cell label="Carteira" style={{ width: '10.3%' }}>
              {formatarCarteira(boleto)}
            </Cell>
            <Cell label="Espécie" style={{ width: '10.3%' }}>
              R$
            </Cell>
            <Cell label="Quantidade" style={{ width: '23.6%' }}>
              {' '}
            </Cell>
            <Cell label="Valor" style={{ width: '17.3%' }}>
              {' '}
            </Cell>
            <Cell label="(=) Valor do Documento" style={{ width: '18.0%' }}>
              {formatarValor(boleto.valor)}
            </Cell>
          </tr>
        </tbody>
      </table>

      {/* Instruções + coluna de totais */}
      <div style={{ display: 'flex', marginTop: -1 }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            border: borda,
            borderRight: 'none',
            padding: '4px 6px',
            fontSize: 9.5,
            color: '#374151',
            lineHeight: 1.55,
            minHeight: 92,
          }}
        >
          {instrucoes.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <div style={{ width: '18.1%' }}>
          <LinhaTotais label="(-) Desconto/Abatimento" valor={formatarValor(desconto)} primeira />
          <LinhaTotais label="(+) Mora/Multa" valor={formatarValor(moraMulta)} />
          <LinhaTotais label="(+) Outros Acréscimos" valor="0,00" />
          <LinhaTotais label="(=) Valor Cobrado" valor={formatarValor(valorCobrado)} destaque />
        </div>
      </div>

      <BlocoPagador boleto={boleto} />

      {/* Rodapé */}
      <div style={{ border: borda, marginTop: -1, padding: '2px 6px', textAlign: 'right', fontSize: 8.5, color: '#111827' }}>
        {variante === 'recibo' ? 'Autenticação Mecânica' : 'Ficha de Compensação/Autenticação Mecânica'}
      </div>

      {/* Código de barras (apenas na ficha) */}
      {variante === 'ficha' && (
        <div style={{ marginTop: 8 }}>
          <BarcodeSvg codigo={boleto.codigoBarras} />
        </div>
      )}
    </div>
  );
}

/** Documento completo: Recibo do Sacado + Ficha de Compensação. Usado na tela e na impressão. */
export function BoletoDocumento({ boleto }: { boleto: Boleto }) {
  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#111827' }}>
      <div className="copia">
        <FichaBoleto boleto={boleto} variante="recibo" />
      </div>
      <div
        style={{
          margin: '10px 0',
          borderTop: '1px dashed #9ca3af',
          fontSize: 8,
          textAlign: 'center',
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Corte aqui
      </div>
      <div className="copia">
        <FichaBoleto boleto={boleto} variante="ficha" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ações                                                               */
/* ------------------------------------------------------------------ */

function Copiar({ texto, label, sucessoLabel }: { texto: string; label: string; sucessoLabel: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <button
      onClick={copiar}
      disabled={!texto}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copiado ? <span className="text-green-600">✓ {sucessoLabel}</span> : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Viewer                                                              */
/* ------------------------------------------------------------------ */

export function BoletoViewer({ tituloId, onClose }: BoletoViewerProps) {
  const { data: boleto, isLoading, isError } = useBoleto(tituloId);

  const imprimir = () => {
    if (!boleto) return;
    const corpo = renderToStaticMarkup(<BoletoDocumento boleto={boleto} />);
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Boleto ${boleto.numeroDocumento}</title>
<style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; }
  .copia { page-break-inside: avoid; break-inside: avoid; }
</style>
</head>
<body>${corpo}</body>
</html>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const semBoleto = boleto && !boleto.linhaDigitavel && !boleto.codigoBarras;

  return (
    <Dialog open={!!tituloId} onClose={onClose} className="max-w-4xl">
      <div className="flex h-full flex-col overflow-hidden bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-bold text-gray-900">Boleto</h2>
            {boleto && !semBoleto && (
              <span className="text-xs text-gray-400">
                {nomeBanco(boleto.codigoBanco)} · {boleto.numeroDocumento || `NUFIN ${boleto.tituloId}`}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
          {isLoading && (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando boleto...
            </div>
          )}

          {isError && (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <p>Não foi possível carregar o boleto deste título.</p>
            </div>
          )}

          {semBoleto && (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-gray-500">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <p>Este título não possui boleto gerado no Sankhya.</p>
              <p className="text-xs text-gray-400">(Sem código de barras / linha digitável na TGFFIN)</p>
            </div>
          )}

          {boleto && !semBoleto && (
            <div className="mx-auto">
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <BoletoDocumento boleto={boleto} />
              </div>

              {/* Ações */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Copiar
                  texto={formatarLinhaDigitavel(boleto.linhaDigitavel)}
                  label="Copiar linha digitável"
                  sucessoLabel="Linha copiada!"
                />
                <Copiar texto={boleto.codigoBarras} label="Copiar código de barras" sucessoLabel="Código copiado!" />
                <button
                  onClick={imprimir}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir boleto
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
