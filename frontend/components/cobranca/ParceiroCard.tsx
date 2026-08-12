'use client';

import { useState } from 'react';
import { FilaItem, AtendimentoHojeItem } from '@/types/cobranca';
import {
  formatCurrency,
  diasAtrasoLabel,
  formatWhatsAppLink,
  formatTelLink,
  formatPhone,
} from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ParceiroDadosExtras } from './ParceiroDadosExtras';
import {
  Phone,
  Mail,
  MessageCircle,
  Clock,
  CheckCircle2,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface ParceiroCardProps {
  item: FilaItem | AtendimentoHojeItem;
  onClick?: () => void;
  isSelected?: boolean;
  variant?: 'list' | 'kanban';
  onConcluir?: (nurel: number) => void;
  onReabrir?: (nurel: number) => void;
}

export function ParceiroCard({
  item,
  onClick,
  isSelected,
  variant = 'list',
  onConcluir,
  onReabrir,
}: ParceiroCardProps) {
  const [emAcaoLocal, setEmAcaoLocal] = useState(false);

  const hasFinanceiro = 'valorVencido' in item && typeof item.valorVencido === 'number';
  const diasAtraso = 'diasAtrasoMax' in item ? item.diasAtrasoMax : 0;
  const atrasoLabel = diasAtrasoLabel(diasAtraso ?? 0);

  const valorDisplay =
    'valorVencido' in item && item.valorVencido ? item.valorVencido : 0;

  const isAtendimento = 'nurel' in item;
  const nurel = isAtendimento ? (item as AtendimentoHojeItem).nurel : 0;
  const pendenteAttr = 'pendente' in item ? (item as { pendente: boolean | null }).pendente : null;
  const isPendente = pendenteAttr === true;
  const isResolvido = pendenteAttr === false;

  const atend = isAtendimento ? (item as AtendimentoHojeItem) : null;

  const handleAction = (e: React.MouseEvent, action: 'concluir' | 'reabrir') => {
    e.stopPropagation();
    if (emAcaoLocal) return;
    setEmAcaoLocal(true);
    const cb = action === 'concluir' ? onConcluir : onReabrir;
    if (cb) {
      cb(nurel);
    }
    setTimeout(() => setEmAcaoLocal(false), 1500);
  };

  const showActions = isAtendimento && (onConcluir || onReabrir) && (isPendente || isResolvido);

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`
        w-full cursor-pointer rounded-xl border bg-white p-3 text-left shadow-sm transition-all
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}
      `}
    >
      {/* Top row: name + priority */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {item.parceiroNome}
          </p>
          {'pendente' in item && pendenteAttr !== null && pendenteAttr !== undefined && (
            <Badge variant={pendenteAttr ? 'warning' : 'success'} className="mt-1">
              {pendenteAttr ? 'Pendente' : 'Resolvido'}
            </Badge>
          )}
        </div>
        {diasAtraso && diasAtraso > 0 && (
          <span className={`text-xs font-medium ${atrasoLabel.color}`}>
            <Clock className="mr-0.5 inline h-3 w-3" />
            {atrasoLabel.label}
          </span>
        )}
      </div>

      {/* Middle: value */}
      {hasFinanceiro && valorDisplay > 0 && (
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(valorDisplay)}</p>
            {'qtdVencidos' in item && item.qtdVencidos && item.qtdVencidos > 0 && (
              <p className="text-xs text-gray-400">
                {`${item.qtdVencidos} vencido${item.qtdVencidos !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bottom: contact icons */}
      <div className="mt-2 flex items-center gap-2 border-t border-gray-100 pt-2">
        {item.telefone ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Phone className="h-3 w-3" />
            Telefone
          </span>
        ) : null}
        {item.email ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Mail className="h-3 w-3" />
            E-mail
          </span>
        ) : null}
        {!item.telefone && !item.email && (
          <span className="text-xs text-red-400">Sem contato cadastrado</span>
        )}
        {'qtdTitulos' in item && item.qtdTitulos && item.qtdTitulos > 1 && (
          <span className="ml-auto text-xs font-medium text-gray-400">
            {item.qtdTitulos} títulos
          </span>
        )}
      </div>

      {/* Action buttons */}
      {(showActions || item.telefone) && (
        <div className="mt-2 flex gap-1.5">
          {showActions && isPendente && onConcluir && (
            <button
              onClick={(e) => handleAction(e, 'concluir')}
              disabled={emAcaoLocal}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-green-600 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {emAcaoLocal ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Finalizar
            </button>
          )}
          {showActions && isResolvido && onReabrir && (
            <button
              onClick={(e) => handleAction(e, 'reabrir')}
              disabled={emAcaoLocal}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-orange-200 bg-orange-50 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
            >
              {emAcaoLocal ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              Reabrir
            </button>
          )}

          {item.telefone && (
            <>
              <a
                href={formatWhatsAppLink(item.telefone)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                title="WhatsApp"
              >
                <MessageCircle className="h-3 w-3" />
              </a>
              <a
                href={formatTelLink(item.telefone)}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                title={formatPhone(item.telefone)}
              >
                <Phone className="h-3 w-3" />
              </a>
            </>
          )}
        </div>
      )}

      {/* Toggle: ver dados completos do parceiro */}
      <ParceiroDadosExtras
        razaoSocial={'razaoSocial' in item ? item.razaoSocial : undefined}
        nomeFantasia={'nomeFantasia' in item ? item.nomeFantasia : undefined}
        tipoPessoa={'tipoPessoa' in item ? item.tipoPessoa : undefined}
        pessoFisJur={'pessoFisJur' in item ? item.pessoFisJur : undefined}
        inscricaoEstadual={'inscricaoEstadual' in item ? item.inscricaoEstadual : undefined}
        cnpjCpf={item.cnpjCpf}
        logradouro={'logradouro' in item ? item.logradouro : undefined}
        numeroEnd={'numeroEnd' in item ? item.numeroEnd : undefined}
        complemento={'complemento' in item ? item.complemento : undefined}
        cep={'cep' in item ? item.cep : undefined}
        bairro={'bairro' in item ? item.bairro : undefined}
        cidade={'cidade' in item ? item.cidade : undefined}
        uf={'uf' in item ? item.uf : undefined}
      />
    </div>
  );
}
