'use client';

import { useState, useEffect } from 'react';
import { Cliente, SITUACAO_LABELS } from '@/types/cliente';
import { useClientes, useDebounce } from '@/hooks/useCliente';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/useToast';
import {
  Search,
  Pencil,
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

function ClientesListSkeleton() {
  return (
    <div className="divide-y divide-gray-100 animate-in fade-in duration-300">
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="flex items-center justify-between px-4 py-3.5 gap-4">
          <Skeleton className="h-4 w-12" />
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Skeleton className="h-7 w-7 rounded-md shrink-0" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function ClientesList({ onEditCliente }: ClientesListProps) {
  const [busca, setBusca] = useState('');
  const [ativoFiltro, setAtivoFiltro] = useState<'S' | 'N' | ''>('');
  const [limite, setLimite] = useState(50);

  const buscaDebounced = useDebounce(busca, 500);
  const cleanedBusca = buscaDebounced.trim();

  useEffect(() => {
    setLimite(50);
  }, [cleanedBusca, ativoFiltro]);

  const { data, isLoading, isError, error, isFetching } = useClientes(
    {
      nome: cleanedBusca || undefined,
      ativo: ativoFiltro !== '' ? ativoFiltro : undefined,
    },
    1,
    limite
  );

  const clientes = data?.clientes || [];
  const total = data?.total || 0;
  const temMais = clientes.length < total;

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar cliente por nome, razão social, CNPJ ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-9 pr-8 py-2 text-xs font-bold text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden transition-colors"
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
          <span className="text-xs font-bold text-gray-700 mr-1 hidden md:inline">
            Status:
          </span>
          <button
            onClick={() => setAtivoFiltro('')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              ativoFiltro === ''
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setAtivoFiltro('S')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              ativoFiltro === 'S'
                ? 'bg-green-600 text-white shadow-xs'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            Ativos
          </button>
          <button
            onClick={() => setAtivoFiltro('N')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              ativoFiltro === 'N'
                ? 'bg-gray-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inativos
          </button>
        </div>
      </div>

      {/* Content Table / States */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between text-xs text-gray-700 font-semibold">
          <span>
            Exibindo <strong className="text-gray-900">{clientes.length}</strong> de <strong className="text-gray-900">{total}</strong> registros
          </span>
          <span className="italic text-indigo-700 font-bold">
            💡 Dica: Clique duas vezes sobre qualquer linha para editar o cliente
          </span>
        </div>
        {isLoading ? (
          <ClientesListSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center p-12 text-red-600">
            <AlertTriangle className="h-8 w-8 mb-2 text-red-600" />
            <p className="text-xs font-bold">Erro ao carregar clientes</p>
            <p className="text-xs text-gray-600 mt-1 font-semibold">
              {(error as any)?.message || 'Erro de conexão com o servidor'}
            </p>
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-600">
            <User className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm font-extrabold text-gray-900">Nenhum cliente encontrado</p>
            <p className="text-xs font-semibold text-gray-600 max-w-sm mt-1">
              {busca
                ? 'Não foram encontrados registros para o termo pesquisado.'
                : 'Comece cadastrando o primeiro cliente clicando em "+ Novo Cliente".'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-100/80 text-gray-800 font-bold uppercase tracking-wider">
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
              <tbody className="divide-y divide-gray-100 text-gray-900 font-semibold">
                {clientes.map((cliente) => {
                  const isJuridica = cliente.tipoPessoa === 'J';
                  const docFormatado = formatCnpjCpf(cliente.cnpjCpf || '');
                  const foneFormatado = formatPhone(cliente.telefone || '');

                  return (
                    <tr
                      key={cliente.codParc}
                      onDoubleClick={() => onEditCliente(cliente)}
                      title="Clique duas vezes para abrir os dados do cliente"
                      className="hover:bg-indigo-50/60 cursor-pointer transition-colors"
                    >
                      {/* Código */}
                      <td className="px-4 py-3.5 font-extrabold text-gray-900">
                        #{cliente.codParc}
                      </td>

                      {/* Nome / Razão Social */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              isJuridica
                                ? 'bg-indigo-100 text-indigo-700'
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
                            <p className="truncate font-extrabold text-gray-900">
                              {cliente.razaoSocial || cliente.nomeParc}
                            </p>
                            {cliente.razaoSocial && cliente.razaoSocial !== cliente.nomeParc && (
                              <p className="truncate text-xs font-medium text-gray-500">
                                {cliente.nomeParc}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* CNPJ / CPF */}
                      <td className="px-4 py-3.5 font-mono font-bold text-gray-800">
                        {docFormatado || '--'}
                      </td>

                      {/* Contato */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          {foneFormatado && (
                            <div className="flex items-center gap-1 text-gray-800 font-bold">
                              <span>{foneFormatado}</span>
                            </div>
                          )}
                          {cliente.email && (
                            <div className="flex items-center gap-1 text-gray-700 font-semibold">
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
                          <div className="flex items-center gap-1 text-gray-800 font-semibold">
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
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditCliente(cliente)}
                            title="Editar cliente"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-bold text-gray-800 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-colors shadow-xs"
                          >
                            <Pencil className="h-3.5 w-3.5 text-indigo-600" />
                            Editar
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
          <div className="flex items-center justify-center gap-3 border-t border-gray-200 px-4 py-3 bg-gray-50/50">
            <span className="text-xs font-semibold text-gray-700">
              Exibindo {clientes.length} de {total} clientes
            </span>
            <button
              onClick={() => setLimite((l) => l + 50)}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-100 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Carregar mais
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
