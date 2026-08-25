'use client';

import { useState, useEffect } from 'react';
import { Cliente, SITUACAO_LABELS, SituacaoCliente } from '@/types/cliente';
import { useClientes, useDeletarCliente, useDebounce } from '@/hooks/useCliente';
import {
  Search,
  Pencil,
  Trash2,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Loader2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { formatCnpjCpf, formatPhone } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ClientesListProps {
  onEditCliente: (cliente: Cliente) => void;
}

export function ClientesList({ onEditCliente }: ClientesListProps) {
  const [busca, setBusca] = useState('');
  const [ativoFiltro, setAtivoFiltro] = useState<'S' | 'N' | ''>('');
  const [limite, setLimite] = useState(50);

  const [clienteParaDeletar, setClienteParaDeletar] = useState<Cliente | null>(null);

  const deletarMutation = useDeletarCliente();

  const buscaDebounced = useDebounce(busca, 500);
  const cleanedBusca = buscaDebounced.trim();

  useEffect(() => {
    setLimite(50);
  }, [cleanedBusca, ativoFiltro]);

  const { data, isLoading, isError, error, isFetching } = useClientes({
    nome: cleanedBusca || undefined,
    ativo: ativoFiltro !== '' ? ativoFiltro : undefined,
  }, 1, limite);

  const clientes = data?.clientes || [];
  const total = data?.total || 0;
  const temMais = clientes.length < total;

  const handleConfirmDelete = async () => {
    if (!clienteParaDeletar) return;
    try {
      await deletarMutation.mutateAsync(clienteParaDeletar.codParc);
      setClienteParaDeletar(null);
    } catch {
      // handled by mutation error state
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar cliente por nome, razão social, CNPJ ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-9 pr-8 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-xs font-medium text-gray-500 mr-1 hidden md:inline">
            Status:
          </span>
          <button
            onClick={() => setAtivoFiltro('')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              ativoFiltro === ''
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setAtivoFiltro('S')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              ativoFiltro === 'S'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            Ativos
          </button>
          <button
            onClick={() => setAtivoFiltro('N')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              ativoFiltro === 'N'
                ? 'bg-gray-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inativos
          </button>
        </div>
      </div>

      {/* Content Table / States */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50/50 px-4 py-2 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span>Exibindo <strong>{clientes.length}</strong> de <strong>{total}</strong> registros</span>
          <span className="italic text-blue-600 font-medium">💡 Dica: Clique duas vezes sobre qualquer linha para visualizar os dados do cliente</span>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs font-medium">Carregando lista de clientes...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center p-12 text-red-600">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="text-xs font-semibold">Erro ao carregar clientes</p>
            <p className="text-xs text-gray-500 mt-1">
              {(error as any)?.message || 'Erro de conexão com o servidor'}
            </p>
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
            <User className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm font-bold text-gray-700">Nenhum cliente encontrado</p>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              {busca
                ? 'Não foram encontrados registros para o termo pesquisado.'
                : 'Comece cadastrando o primeiro cliente clicando em "+ Novo Cliente".'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Cliente / Razão Social</th>
                  <th className="px-4 py-3">CNPJ / CPF</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Cidade / UF</th>
                  <th className="px-4 py-3">Situação</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {clientes.map((cliente) => {
                  const isJuridica = cliente.tipoPessoa === 'J';
                  const docFormatado = formatCnpjCpf(cliente.cnpjCpf || '');
                  const foneFormatado = formatPhone(cliente.telefone || '');

                  return (
                    <tr
                      key={cliente.codParc}
                      onDoubleClick={() => onEditCliente(cliente)}
                      title="Clique duas vezes para abrir os dados do cliente"
                      className="hover:bg-blue-50/70 cursor-pointer transition-colors"
                    >
                      {/* Código */}
                      <td className="px-4 py-3.5 font-bold text-gray-900">
                        #{cliente.codParc}
                      </td>

                      {/* Nome / Razão Social */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                              isJuridica
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {isJuridica ? (
                              <Building className="h-3.5 w-3.5" />
                            ) : (
                              <User className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <p className="truncate font-semibold text-gray-900">
                              {cliente.nomeParc}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* CNPJ / CPF */}
                      <td className="px-4 py-3.5 font-mono text-gray-600">
                        {docFormatado || '--'}
                      </td>

                      {/* Contato */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          {foneFormatado && (
                            <div className="flex items-center gap-1 text-gray-700">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span>{foneFormatado}</span>
                            </div>
                          )}
                          {cliente.email && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <span className="truncate max-w-[150px]">
                                {cliente.email}
                              </span>
                            </div>
                          )}
                          {!foneFormatado && !cliente.email && (
                            <span className="text-gray-400">--</span>
                          )}
                        </div>
                      </td>

                      {/* Cidade / UF */}
                      <td className="px-4 py-3.5">
                        {cliente.endereco?.cidade || cliente.endereco?.uf ? (
                          <div className="flex items-center gap-1 text-gray-700">
                            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                            <span>
                              {cliente.endereco.cidade}
                              {cliente.endereco.uf ? `/${cliente.endereco.uf}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          {cliente.ativo ? (
                            <Badge variant="success">Ativo</Badge>
                          ) : (
                            <Badge variant="default">Inativo</Badge>
                          )}
                          {cliente.situacao && SITUACAO_LABELS[cliente.situacao] && (
                            <span className="text-[10px] font-medium text-gray-400">
                              Crédito: {SITUACAO_LABELS[cliente.situacao]}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditCliente(cliente)}
                            title="Editar cliente"
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5 text-blue-600" />
                            Editar
                          </button>
                          <button
                            onClick={() => setClienteParaDeletar(cliente)}
                            title="Inativar/Excluir"
                            className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More */}
        {!isLoading && !isError && temMais && (
          <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-4 py-3">
            <span className="text-xs text-gray-500">
              Exibindo {clientes.length} de {total} clientes
            </span>
            <button
              onClick={() => setLimite(l => l + 50)}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Carregar mais
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {clienteParaDeletar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl space-y-4 text-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Inativar Cliente</h3>
                <p className="text-xs text-gray-500">Confirmar alteração de situação</p>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              Tem certeza que deseja inativar o cliente{' '}
              <strong className="text-gray-900">{clienteParaDeletar.nomeParc}</strong> (Código #{clienteParaDeletar.codParc})?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setClienteParaDeletar(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletarMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deletarMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Inativando...
                  </>
                ) : (
                  'Confirmar Inativação'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
