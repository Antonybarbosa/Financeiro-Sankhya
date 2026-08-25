'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTitulosPorCliente } from '@/hooks/useCobranca';
import { useSimularRenegociacao, useConfirmarRenegociacao } from '@/hooks/useRenegociacao';
import { toast } from '@/hooks/useToast';
import {
  RenegociacaoParams,
  SimulacaoResultado,
  ConfirmacaoResultado,
  ParcelaSimulada,
  TitOrig,
  DEFAULT_RENEGOCIACAO_PARAMS,
  DEFAULT_PREFS,
  FREQUENCIA_OPCOES,
  VENCIMENTO_OPCOES,
  NEGOCIACAO_OPCOES,
  TIPO_TITULO_OPCOES,
  CONTA_OPCOES,
  EMPRESA_OPCOES,
} from '@/types/renegociacao';
import { formatCurrency, formatDate, formatSankhyaDate } from '@/lib/utils';
import { Dialog, DialogHeader, DialogTitle, DialogCloseButton, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Loader2,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Handshake,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Layers,
} from 'lucide-react';

interface RenegociacaoModalProps {
  parceiroId: number;
  parceiroNome: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RenegociacaoModal({ parceiroId, parceiroNome, open, onClose, onSuccess }: RenegociacaoModalProps) {
  const { data: titulos, isLoading: loadingTitulos } = useTitulosPorCliente(parceiroId);
  const simular = useSimularRenegociacao();
  const confirmar = useConfirmarRenegociacao();

  const titulosEmAberto = useMemo(
    () => (titulos || []).filter((t) => t.isEmAberto),
    [titulos],
  );

  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [params, setParams] = useState<Omit<RenegociacaoParams, 'nufins'>>(DEFAULT_RENEGOCIACAO_PARAMS);
  const [simulacao, setSimulacao] = useState<SimulacaoResultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoResultado | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelected(new Set(titulosEmAberto.map((t) => t.id)));
      setSimulacao(null);
      setErro(null);
      setConfirmacao(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && selected.size === 0 && titulosEmAberto.length > 0) {
      setSelected(new Set(titulosEmAberto.map((t) => t.id)));
    }
  }, [titulosEmAberto, open]);

  const valorOriginalSelecionado = useMemo(
    () => titulosEmAberto.filter((t) => selected.has(t.id)).reduce((sum, t) => sum + t.valorEmAberto, 0),
    [titulosEmAberto, selected],
  );

  const valorJurosMultaEstimado = useMemo(() => {
    const taxaTotal = (params.txjur || 0) + (params.txmul || 0);
    return (valorOriginalSelecionado * taxaTotal) / 100;
  }, [valorOriginalSelecionado, params.txjur, params.txmul]);

  const valorTotalEstimado = valorOriginalSelecionado + valorJurosMultaEstimado;
  const valorParcelaEstimado = params.nroparcel > 0 ? valorTotalEstimado / params.nroparcel : 0;

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSimulacao(null);
  };

  const toggleAll = () => {
    if (selected.size === titulosEmAberto.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(titulosEmAberto.map((t) => t.id)));
    }
    setSimulacao(null);
  };

  const update = <K extends keyof typeof params>(key: K, value: (typeof params)[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    setSimulacao(null);
  };

  const buildSimularPayload = (): RenegociacaoParams => ({
    ...params,
    nufins: Array.from(selected),
  });

  const handleSimular = async () => {
    if (selected.size === 0) {
      toast.warning('Nenhum título selecionado', 'Selecione ao menos 1 título em aberto para renegociar.');
      return;
    }
    if (params.venc === '3' && !params.novaDataVencimento) {
      toast.warning('Data de vencimento obrigatória', 'Informe a data fixa do primeiro vencimento.');
      return;
    }

    setErro(null);
    setSimulacao(null);
    try {
      const res = await simular.mutateAsync(buildSimularPayload());
      setSimulacao(res);
      setStep(2);
      toast.success('Simulação concluída', `${res.parcelas.length} parcelas calculadas com sucesso.`);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao simular o parcelamento no Sankhya.';
      setErro(msg);
      toast.error('Erro na simulação', msg);
    }
  };

  const handleConfirmar = async () => {
    if (!simulacao) return;
    setErro(null);
    try {
      const nufins = Array.from(selected);
      const titOrigs: TitOrig[] = nufins.map((nuFin) => ({
        NUFIN: nuFin,
        VLRJURO: params.jur ?? 0,
        VLRMULTA: params.mul ?? 0,
      }));

      const res = await confirmar.mutateAsync({
        nufins,
        parcelas: simulacao.parcelas,
        titOrigs,
        prefs: DEFAULT_PREFS,
      });
      setConfirmacao(res);
      toast.success('Renegociação concluída!', `Renegociação Nº ${res.nureneg || 'gerada'} registrada no Sankhya.`);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao confirmar a renegociação.';
      setErro(msg);
      toast.error('Erro ao confirmar', msg);
    }
  };

  const allSelected = selected.size === titulosEmAberto.length && titulosEmAberto.length > 0;
  const podeSimular = selected.size > 0 && !simular.isPending;
  const podeConfirmar = !!simulacao && !confirmar.isPending && !confirmacao;
  const totalParcelasSimuladas = simulacao?.parcelas.length ?? 0;
  const valorTotalParcelasSimuladas = simulacao?.parcelas.reduce(
    (sum, p) => sum + parseFloat(p.VLRDESDOB ?? '0'),
    0,
  ) ?? 0;

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl">
      <DialogHeader className="border-b border-gray-200 bg-gray-50/60">
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-gray-900">Renegociação de Títulos</DialogTitle>
              <p className="text-xs text-gray-700 font-semibold">{parceiroNome} (Cód #{parceiroId})</p>
            </div>
          </div>

          {/* Stepper Header */}
          {!confirmacao && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${
                  step === 1 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-200 text-gray-700'
                }`}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-indigo-900">
                  1
                </span>
                Títulos & Regras
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${
                  step === 2 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-200 text-gray-700'
                }`}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-indigo-900">
                  2
                </span>
                Prévia & Confirmação
              </div>
            </div>
          )}
        </div>
        <DialogCloseButton onClose={onClose} />
      </DialogHeader>

      <DialogContent className="space-y-4">
        {confirmacao ? (
          /* Step 3: Tela Final de Sucesso */
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700 mb-3 shadow-xs">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <p className="text-lg font-extrabold text-gray-900">Renegociação Concluída no Sankhya!</p>
              <p className="mt-1 text-xs font-semibold text-gray-700 max-w-md">
                A operação foi processada no Sankhya. Foram gerados{' '}
                <strong className="text-gray-900">{confirmacao.parcelasGeradas.length} novos títulos</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
              <div className="border-b border-gray-200 bg-gray-100/80 px-4 py-2.5 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-800">
                  Nº da Renegociação: <span className="text-indigo-700 font-extrabold">#{confirmacao.nureneg || '—'}</span>
                </span>
                <span className="text-xs font-bold text-gray-600">Sankhya mgefin</span>
              </div>
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-100/70">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-bold text-gray-800">Parcela</th>
                    <th className="px-4 py-2.5 text-left font-bold text-gray-800">NUFIN</th>
                    <th className="px-4 py-2.5 text-left font-bold text-gray-800">Vencimento</th>
                    <th className="px-4 py-2.5 text-right font-bold text-gray-900">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-gray-900">
                  {confirmacao.parcelasGeradas.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-bold text-gray-900">{i + 1}ª Parcela</td>
                      <td className="px-4 py-2 font-mono font-bold text-gray-800">#{p.nuFin || '—'}</td>
                      <td className="px-4 py-2 font-semibold text-gray-800">
                        {p.dataVencimento ? formatSankhyaDate(p.dataVencimento) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-black text-green-700">
                        {formatCurrency(p.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100/80">
                  <tr>
                    <td className="px-4 py-2.5 font-bold text-gray-800" colSpan={3}>
                      Total Gerado
                    </td>
                    <td className="px-4 py-2.5 text-right font-black text-gray-900 text-sm">
                      {formatCurrency(confirmacao.parcelasGeradas.reduce((s, p) => s + p.valor, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <>
            {/* Top Summary Card (Alta Visibilidade e Alto Contraste) */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 to-blue-50/90 p-3.5 shadow-xs">
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                  Dívida Original
                </p>
                <p className="text-sm font-extrabold text-gray-900">
                  {formatCurrency(valorOriginalSelecionado)}
                </p>
                <p className="text-xs font-semibold text-gray-700">{selected.size} título(s)</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                  Juros + Multa ({params.txjur + params.txmul}%)
                </p>
                <p className="text-sm font-extrabold text-amber-800">
                  + {formatCurrency(valorJurosMultaEstimado)}
                </p>
                <p className="text-xs font-semibold text-gray-700">Estimado</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                  Total Estimado
                </p>
                <p className="text-sm font-black text-indigo-950">
                  {formatCurrency(valorTotalEstimado)}
                </p>
                <p className="text-xs font-bold text-indigo-800">Final renegociado</p>
              </div>

              <div className="space-y-0.5 border-l border-indigo-200/80 pl-3">
                <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                  Valor da Parcela
                </p>
                <p className="text-sm font-black text-blue-800">
                  {formatCurrency(valorParcelaEstimado)}
                </p>
                <p className="text-xs font-semibold text-gray-700">em {params.nroparcel}x parcelas</p>
              </div>
            </div>

            {/* Step 1: Seleção de Títulos e Parâmetros */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Seleção de Títulos */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-indigo-600" />
                      Títulos em Aberto do Parceiro ({titulosEmAberto.length})
                    </h3>
                    <button
                      onClick={toggleAll}
                      type="button"
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors"
                    >
                      {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>

                  {loadingTitulos ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs font-semibold text-gray-700 bg-gray-50 rounded-xl">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                      Carregando títulos em aberto...
                    </div>
                  ) : titulosEmAberto.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 p-6 text-center text-xs font-semibold text-gray-600">
                      Nenhum título em aberto disponível para renegociação.
                    </p>
                  ) : (
                    <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-gray-200 p-2 bg-white">
                      {titulosEmAberto.map((t) => (
                        <label
                          key={t.id}
                          className={`flex cursor-pointer items-center justify-between rounded-lg p-2.5 transition-all ${
                            selected.has(t.id)
                              ? 'bg-indigo-50/90 border border-indigo-300 text-gray-900'
                              : 'hover:bg-gray-50 border border-transparent text-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selected.has(t.id)}
                              onChange={() => toggle(t.id)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-gray-900">
                                {t.numero ? `Título #${t.numero}` : `NUFIN ${t.id}`}
                                {t.desdobramento && t.desdobramento !== '0' && (
                                  <span className="ml-1 text-[11px] font-bold text-gray-600">
                                    (Parc. {t.desdobramento})
                                  </span>
                                )}
                              </p>
                              <p className="text-xs font-semibold text-gray-700">
                                Vencimento: {formatDate(t.dataVencimento)}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-black text-gray-900">
                            {formatCurrency(t.valorEmAberto)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </section>

                {/* Formulário de Parâmetros com Alto Contraste */}
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    Parâmetros do Parcelamento
                  </h3>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 bg-gray-100/70 p-3.5 rounded-xl border border-gray-200">
                    <Field label="Qtd. de Parcelas">
                      <Input
                        type="number"
                        min={1}
                        value={params.nroparcel}
                        onChange={(e) => update('nroparcel', Math.max(1, parseInt(e.target.value) || 1))}
                        className="bg-white text-xs font-bold text-gray-900 border-gray-300"
                      />
                    </Field>

                    <Field label="Frequência">
                      <Select
                        value={params.freq}
                        onChange={(e) => update('freq', e.target.value)}
                        className="bg-white text-xs font-bold text-gray-900 border-gray-300"
                      >
                        {FREQUENCIA_OPCOES.map((o) => (
                          <option key={o.value} value={o.value} className="text-gray-900 font-medium">
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Vencimento Inicial">
                      <Select
                        value={params.venc}
                        onChange={(e) => update('venc', e.target.value)}
                        className="bg-white text-xs font-bold text-gray-900 border-gray-300"
                      >
                        {VENCIMENTO_OPCOES.map((o) => (
                          <option key={o.value} value={o.value} className="text-gray-900 font-medium">
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    {params.venc === '3' && (
                      <Field label="Data Fixa do 1º Vencimento">
                        <Input
                          type="date"
                          value={params.novaDataVencimento?.split('/').reverse().join('-') ?? ''}
                          onChange={(e) => {
                            const iso = e.target.value;
                            const parts = iso.split('-');
                            const br = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';
                            update('novaDataVencimento', br);
                          }}
                          className="bg-white text-xs font-bold text-gray-900 border-gray-300"
                        />
                      </Field>
                    )}

                    <Field label="Taxa Juros (%)">
                      <Input
                        type="number"
                        step="0.1"
                        value={params.txjur}
                        onChange={(e) => update('txjur', parseFloat(e.target.value) || 0)}
                        className="bg-white text-xs font-bold text-gray-900 border-gray-300"
                      />
                    </Field>

                    <Field label="Taxa Multa (%)">
                      <Input
                        type="number"
                        step="0.1"
                        value={params.txmul}
                        onChange={(e) => update('txmul', parseFloat(e.target.value) || 0)}
                        className="bg-white text-xs font-bold text-gray-900 border-gray-300"
                      />
                    </Field>

                    <Field label="Tipo de Título">
                      <Select
                        value={params.codTipTit}
                        onChange={(e) => update('codTipTit', parseInt(e.target.value) || 2)}
                        className="bg-white text-xs font-bold text-gray-900 border-gray-300"
                      >
                        {TIPO_TITULO_OPCOES.map((o) => (
                          <option key={o.value} value={o.value} className="text-gray-900 font-medium">
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Conta Bancária">
                      <Select
                        value={params.codConta}
                        onChange={(e) => update('codConta', parseInt(e.target.value) || 97)}
                        className="bg-white text-xs font-bold text-gray-900 border-gray-300"
                      >
                        {CONTA_OPCOES.map((o) => (
                          <option key={o.value} value={o.value} className="text-gray-900 font-medium">
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Empresa dos Títulos">
                      <Select
                        value={params.empresaNovosTitulos}
                        onChange={(e) => update('empresaNovosTitulos', parseInt(e.target.value) || 2)}
                        className="bg-white text-xs font-bold text-gray-900 border-gray-300"
                      >
                        {EMPRESA_OPCOES.map((o) => (
                          <option key={o.value} value={o.value} className="text-gray-900 font-medium">
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Tipo de Negociação">
                      <Select
                        value={params.negoc}
                        onChange={(e) => update('negoc', e.target.value)}
                        className="bg-white text-xs font-bold text-gray-900 border-gray-300"
                      >
                        {NEGOCIACAO_OPCOES.map((o) => (
                          <option key={o.value} value={o.value} className="text-gray-900 font-medium">
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <div className="col-span-2 sm:col-span-3 pt-1">
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-900">
                        <input
                          type="checkbox"
                          checked={!!params.comEntrada}
                          onChange={(e) => update('comEntrada', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Gerar 1ª Parcela como Entrada Imediata</span>
                      </label>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Step 2: Prévia das Parcelas & Confirmação */}
            {step === 2 && simulacao && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                  <div className="border-b border-gray-200 bg-gray-100/80 px-4 py-2.5 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Calculator className="h-4 w-4 text-indigo-600" />
                      Prévia das Parcelas Calculadas pelo Sankhya
                    </h3>
                    <span className="text-xs font-extrabold text-indigo-800">
                      {totalParcelasSimuladas} parcela(s)
                    </span>
                  </div>

                  {simulacao.parcelas.length > 0 ? (
                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-bold text-gray-800">Parcela</th>
                            <th className="px-4 py-2.5 text-left font-bold text-gray-800">Vencimento</th>
                            <th className="px-4 py-2.5 text-right font-bold text-gray-800">Valor Base</th>
                            <th className="px-4 py-2.5 text-right font-bold text-gray-800">Juros</th>
                            <th className="px-4 py-2.5 text-right font-bold text-gray-800">Multa</th>
                            <th className="px-4 py-2.5 text-right font-black text-gray-900">Total Parcela</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white text-gray-900 font-semibold">
                          {simulacao.parcelas.map((p: ParcelaSimulada, i) => {
                            const valBase = parseFloat(p.VLRDESDOB ?? '0');
                            const valJuro = parseFloat(p.VLRJURO ?? '0');
                            const valMulta = parseFloat(p.VLRMULTA ?? '0');
                            const valTotalParcela = valBase + valJuro + valMulta;

                            return (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 font-bold text-gray-900">
                                  {p.DESDOBRAMENTO ?? `${i + 1}ª`}
                                </td>
                                <td className="px-4 py-2.5 text-gray-900 font-bold">
                                  {p.DTVENC ? formatSankhyaDate(p.DTVENC) : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right text-gray-800 font-mono">
                                  {formatCurrency(valBase)}
                                </td>
                                <td className="px-4 py-2.5 text-right text-amber-800 font-mono font-bold">
                                  {valJuro > 0 ? `+ ${formatCurrency(valJuro)}` : 'R$ 0,00'}
                                </td>
                                <td className="px-4 py-2.5 text-right text-amber-800 font-mono font-bold">
                                  {valMulta > 0 ? `+ ${formatCurrency(valMulta)}` : 'R$ 0,00'}
                                </td>
                                <td className="px-4 py-2.5 text-right font-black text-indigo-950">
                                  {formatCurrency(valTotalParcela)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-gray-100/90 font-bold border-t border-gray-200">
                          <tr>
                            <td className="px-4 py-2.5 text-gray-900 font-extrabold" colSpan={5}>
                              Total Geral Renegociado
                            </td>
                            <td className="px-4 py-2.5 text-right font-black text-indigo-900 text-sm">
                              {formatCurrency(valorTotalParcelasSimuladas)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="p-6 text-center text-xs font-semibold text-gray-600">
                      Nenhuma parcela retornada na simulação.
                    </p>
                  )}
                </section>
              </div>
            )}

            {erro && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="flex-1 font-bold">{erro}</p>
              </div>
            )}
          </>
        )}
      </DialogContent>

      {/* Footer Navigation */}
      {!confirmacao && (
        <DialogFooter className="flex items-center justify-between sm:justify-between w-full border-t border-gray-200 bg-gray-50/60">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSimular}
                disabled={!podeSimular}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors"
              >
                {simular.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculando parcelas...
                  </>
                ) : (
                  <>
                    Avançar e Simular
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-xs"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar aos Parâmetros
              </button>

              <button
                type="button"
                onClick={handleConfirmar}
                disabled={!podeConfirmar}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-green-700 active:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {confirmar.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando títulos no Sankhya...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar Renegociação
                  </>
                )}
              </button>
            </>
          )}
        </DialogFooter>
      )}

      {confirmacao && (
        <DialogFooter className="border-t border-gray-200 bg-gray-50/60">
          <button
            type="button"
            onClick={() => {
              onSuccess?.();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Concluir e Fechar
          </button>
        </DialogFooter>
      )}
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="block text-[11px] font-bold text-gray-800">{label}</Label>
      {children}
    </div>
  );
}
