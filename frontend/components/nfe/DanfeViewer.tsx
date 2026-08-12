'use client';

import { useNfeDados } from '@/hooks/useNfe';
import { nfeApi } from '@/lib/api';
import { formatCurrency, formatDateTime, formatCnpjCpf } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogCloseButton } from '@/components/ui/dialog';
import {
  Loader2,
  FileText,
  Download,
  ExternalLink,
  AlertCircle,
  Building2,
  User,
  Truck,
  Calendar,
  Hash,
} from 'lucide-react';

interface DanfeViewerProps {
  numnota: number | null;
  nunota?: number | null;
  onClose: () => void;
}

function formatCep(cep: string): string {
  if (!cep) return '';
  const c = cep.replace(/\D/g, '');
  if (c.length === 8) return `${c.slice(0, 5)}-${c.slice(5)}`;
  return cep;
}

function formatPagamento(forma: string): string {
  const map: Record<string, string> = {
    '01': 'Dinheiro',
    '02': 'Cheque',
    '03': 'Cartão de Crédito',
    '04': 'Cartão de Débito',
    '05': 'Crédito Loja',
    '10': 'Vale Alimentação',
    '11': 'Vale Refeição',
    '12': 'Vale Presente',
    '13': 'Vale Combustível',
    '15': 'Boleto Bancário',
    '16': 'Depósito Bancário',
    '17': 'Pagamento Instantâneo (PIX)',
    '18': 'Transferência bancária, Carteira Digital',
    '19': 'Programa de fidelidade, Cashback, Crédito Virtual',
    '90': 'Sem Pagamento',
    '99': 'Outros',
  };
  return map[forma] || forma || '-';
}

function formatFrete(mod: string): string {
  const map: Record<string, string> = {
    '0': 'Por conta do Emitente',
    '1': 'Por conta do Destinatário',
    '2': 'Por conta de Terceiros',
    '9': 'Sem Frete',
  };
  return map[mod] || mod || '-';
}

export function DanfeViewer({ numnota, nunota, onClose }: DanfeViewerProps) {
  const valorBusca = numnota ?? nunota ?? null;
  const tipoBusca = numnota ? 'numnota' : 'nunota';
  const { data: nfe, isLoading, isError, error } = useNfeDados(valorBusca, tipoBusca);

  return (
    <Dialog open={!!valorBusca} onClose={onClose} className="max-w-4xl">
      <DialogCloseButton onClose={onClose} />

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Carregando DANFE...</span>
        </div>
      )}

      {isError && (
        <div className="p-12 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-3 font-medium text-red-700">Erro ao carregar DANFE</p>
          <p className="mt-1 text-sm text-red-500">
            {error instanceof Error ? error.message : 'NFE não encontrada'}
          </p>
        </div>
      )}

      {nfe && (
        <div className="space-y-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-gray-800 bg-gray-100 px-6 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-gray-700" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">DANFE</h2>
                <p className="text-xs text-gray-500">
                  Documento Auxiliar da NFE
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={nfe.status?.startsWith('100') ? 'success' : 'warning'}>
                {nfe.status || 'Status desconhecido'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(nfeApi.getXmlUrl(nfe.nunota), '_blank')}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                XML
              </Button>
            </div>
          </div>

          <div className="max-h-[calc(90vh-80px)] overflow-y-auto px-6 py-4">
            {/*Nota info */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-4">
              <div>
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <Hash className="h-3 w-3" /> Número da Nota
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {nfe.numnota || nfe.numero}
                  {nfe.numnota && nfe.numero && nfe.numnota.toString() !== nfe.numero && (
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      (XML: {nfe.numero})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Série</p>
                <p className="text-sm font-bold text-gray-900">{nfe.serie}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" /> Emissão
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {formatDateTime(nfe.dataEmissao)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Natureza Operação</p>
                <p className="truncate text-sm font-medium text-gray-900" title={nfe.naturezaOperacao}>
                  {nfe.naturezaOperacao}
                </p>
              </div>
            </div>

            {/* Chave de acesso */}
            <div className="mt-3 rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-500">Chave de Acesso</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <code className="break-all font-mono text-sm text-gray-800">
                  {nfe.chave}
                </code>
                <a
                  href={`https://www.nfe.fazenda.gov.br/portal/consulta.aspx?contingencia=0&chave=${nfe.chave}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  Consultar
                </a>
              </div>
            </div>

            {/* Emitente / Destinatário */}
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Emitente */}
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-gray-900">Emitente</h3>
                </div>
                <dl className="space-y-1 text-xs">
                  <div>
                    <dt className="text-gray-400">Razão Social</dt>
                    <dd className="font-medium text-gray-800">{nfe.emitente.razaoSocial}</dd>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <dt className="text-gray-400">CNPJ</dt>
                      <dd className="font-medium text-gray-800">{formatCnpjCpf(nfe.emitente.cnpj)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">IE</dt>
                      <dd className="font-medium text-gray-800">{nfe.emitente.ie}</dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-gray-400">Endereço</dt>
                    <dd className="font-medium text-gray-800">{nfe.emitente.endereco}</dd>
                    <dd className="text-gray-600">
                      {nfe.emitente.bairro} — {nfe.emitente.municipio}/{nfe.emitente.uf}
                    </dd>
                    <dd className="text-gray-600">CEP: {formatCep(nfe.emitente.cep)}</dd>
                  </div>
                </dl>
              </div>

              {/* Destinatário */}
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-bold text-gray-900">Destinatário</h3>
                </div>
                <dl className="space-y-1 text-xs">
                  <div>
                    <dt className="text-gray-400">Razão Social / Nome</dt>
                    <dd className="font-medium text-gray-800">{nfe.destinatario.razaoSocial}</dd>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <dt className="text-gray-400">CNPJ/CPF</dt>
                      <dd className="font-medium text-gray-800">{formatCnpjCpf(nfe.destinatario.cnpjCpf)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">IE</dt>
                      <dd className="font-medium text-gray-800">{nfe.destinatario.ie}</dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-gray-400">Endereço</dt>
                    <dd className="font-medium text-gray-800">{nfe.destinatario.endereco}</dd>
                    <dd className="text-gray-600">
                      {nfe.destinatario.bairro} — {nfe.destinatario.municipio}/{nfe.destinatario.uf}
                    </dd>
                    <dd className="text-gray-600">CEP: {formatCep(nfe.destinatario.cep)}</dd>
                  </div>
                  {nfe.destinatario.email && (
                    <div>
                      <dt className="text-gray-400">E-mail</dt>
                      <dd className="font-medium text-gray-800">{nfe.destinatario.email}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Itens */}
            <div className="mt-3">
              <h3 className="mb-2 text-sm font-bold text-gray-900">Produtos / Serviços</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">Código</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">Descrição</th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500">CFOP</th>
                      <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500">Qtde</th>
                      <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500">Vl. Unit.</th>
                      <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500">Vl. Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {nfe.itens.map((item) => (
                      <tr key={item.numero} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-xs text-gray-500">{item.numero}</td>
                        <td className="px-2 py-1.5 text-xs font-medium text-gray-700">{item.codigo}</td>
                        <td className="px-2 py-1.5 text-xs text-gray-800">
                          {item.descricao}
                          {item.ncm && (
                            <span className="ml-2 text-gray-400">NCM: {item.ncm}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs text-gray-600">{item.cfop}</td>
                        <td className="px-2 py-1.5 text-right text-xs text-gray-600">
                          {item.quantidade} {item.unidade}
                        </td>
                        <td className="px-2 py-1.5 text-right text-xs text-gray-600">
                          {formatCurrency(item.valorUnitario)}
                        </td>
                        <td className="px-2 py-1.5 text-right text-xs font-semibold text-gray-800">
                          {formatCurrency(item.valorTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totais + Transporte */}
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Totais */}
              <div className="rounded-lg border border-gray-200 p-3">
                <h3 className="mb-2 text-sm font-bold text-gray-900">Totais</h3>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Valor dos Produtos</dt>
                    <dd className="font-medium text-gray-700">{formatCurrency(nfe.totais.valorProdutos)}</dd>
                  </div>
                  {nfe.totais.valorDesconto > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Desconto</dt>
                      <dd className="font-medium text-red-600">- {formatCurrency(nfe.totais.valorDesconto)}</dd>
                    </div>
                  )}
                  {nfe.totais.valorFrete > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Frete</dt>
                      <dd className="font-medium text-gray-700">+ {formatCurrency(nfe.totais.valorFrete)}</dd>
                    </div>
                  )}
                  {nfe.totais.valorSeguro > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Seguro</dt>
                      <dd className="font-medium text-gray-700">+ {formatCurrency(nfe.totais.valorSeguro)}</dd>
                    </div>
                  )}
                  {nfe.totais.valorIcms > 0 && (
                    <div className="flex justify-between border-t border-gray-100 pt-1">
                      <dt className="text-gray-500">Base ICMS</dt>
                      <dd className="text-gray-600">{formatCurrency(nfe.totais.baseCalculoIcms)}</dd>
                    </div>
                  )}
                  {nfe.totais.valorIcms > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Valor ICMS</dt>
                      <dd className="text-gray-600">{formatCurrency(nfe.totais.valorIcms)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-gray-300 pt-1.5">
                    <dt className="text-sm font-bold text-gray-900">Valor Total da Nota</dt>
                    <dd className="text-base font-bold text-blue-700">{formatCurrency(nfe.totais.valorTotal)}</dd>
                  </div>
                </dl>
              </div>

              {/* Transporte + Pagamento */}
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-bold text-gray-900">Transporte</h3>
                  </div>
                  <dl className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Modalidade</dt>
                      <dd className="font-medium text-gray-700">{formatFrete(nfe.transporte.modalidadeFrete)}</dd>
                    </div>
                    {nfe.transporte.transportadora && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Transportadora</dt>
                        <dd className="font-medium text-gray-700">{nfe.transporte.transportadora}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <h3 className="mb-2 text-sm font-bold text-gray-900">Pagamento</h3>
                  <dl className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Forma</dt>
                      <dd className="font-medium text-gray-700">{formatPagamento(nfe.pagamento.forma)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Valor</dt>
                      <dd className="font-medium text-gray-700">{formatCurrency(nfe.pagamento.valor)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* QR Code (NFC-e) */}
            {nfe.qrCode && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex h-16 w-16 items-center justify-center rounded bg-white">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(nfe.qrCode)}`}
                    alt="QR Code"
                    className="h-14 w-14"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Consulta via QR Code (NFC-e)</p>
                  <a
                    href={nfe.qrCode}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    Abrir link de consulta
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
