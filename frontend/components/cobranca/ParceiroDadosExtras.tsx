'use client';

import { useState } from 'react';
import { formatCnpjCpf, formatCep } from '@/lib/utils';
import { ChevronDown, ChevronUp, MapPin, Building2, FileText } from 'lucide-react';

interface ParceiroDadosExtrasProps {
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  tipoPessoa?: string | null;
  pessoFisJur?: string | null;
  inscricaoEstadual?: string | null;
  cnpjCpf?: string | null;
  logradouro?: string | null;
  numeroEnd?: string | null;
  complemento?: string | null;
  cep?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  compact?: boolean;
}

export function ParceiroDadosExtras({
  razaoSocial,
  nomeFantasia,
  pessoFisJur,
  inscricaoEstadual,
  cnpjCpf,
  logradouro,
  numeroEnd,
  complemento,
  cep,
  bairro,
  cidade,
  uf,
  compact = false,
}: ParceiroDadosExtrasProps) {
  const [expandido, setExpandido] = useState(false);

  const temEndereco = !!(logradouro || bairro || cidade || cep);
  const temFiscais = !!(razaoSocial || nomeFantasia || inscricaoEstadual || cnpjCpf);
  if (!temEndereco && !temFiscais) return null;

  const enderecoLinha = [logradouro, numeroEnd, complemento].filter(Boolean).join(', ');
  const cidadeUf = [cidade, uf].filter(Boolean).join(' - ');
  const tipoPessoaLabel = pessoFisJur === 'F' ? 'Pessoa Física' : pessoFisJur === 'J' ? 'Pessoa Jurídica' : null;

  return (
    <div className={`mt-2 border-t border-gray-100 pt-2 ${compact ? '' : ''}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpandido((v) => !v);
        }}
        className="flex w-full items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Ver dados do parceiro
        </span>
        {expandido ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expandido && (
        <div className="mt-2 space-y-2 rounded-md bg-gray-50 p-2.5 text-xs">
          {temFiscais && (
            <div className="space-y-1">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <Building2 className="h-3 w-3" />
                Dados fiscais
              </p>
              <dl className="grid grid-cols-3 gap-x-2 gap-y-1">
                {razaoSocial && (
                  <>
                    <dt className="text-gray-500">Razão Social</dt>
                    <dd className="col-span-2 text-gray-800">{razaoSocial}</dd>
                  </>
                )}
                {nomeFantasia && (
                  <>
                    <dt className="text-gray-500">Fantasia</dt>
                    <dd className="col-span-2 text-gray-800">{nomeFantasia}</dd>
                  </>
                )}
                {cnpjCpf && (
                  <>
                    <dt className="text-gray-500">{tipoPessoaLabel === 'Pessoa Física' ? 'CPF' : 'CNPJ'}</dt>
                    <dd className="col-span-2 font-mono text-gray-800">{formatCnpjCpf(cnpjCpf)}</dd>
                  </>
                )}
                {inscricaoEstadual && (
                  <>
                    <dt className="text-gray-500">Insc. Estadual</dt>
                    <dd className="col-span-2 font-mono text-gray-800">{inscricaoEstadual}</dd>
                  </>
                )}
                {tipoPessoaLabel && (
                  <>
                    <dt className="text-gray-500">Tipo</dt>
                    <dd className="col-span-2 text-gray-800">{tipoPessoaLabel}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {temEndereco && (
            <div className={`space-y-1 ${temFiscais ? 'border-t border-gray-200 pt-2' : ''}`}>
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <MapPin className="h-3 w-3" />
                Endereço
              </p>
              {enderecoLinha && <p className="text-gray-800">{enderecoLinha}</p>}
              {bairro && <p className="text-gray-600">{bairro}</p>}
              {cidadeUf && <p className="text-gray-600">{cidadeUf}</p>}
              {cep && <p className="font-mono text-gray-600">{formatCep(cep)}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
