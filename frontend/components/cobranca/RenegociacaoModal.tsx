'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTitulosPorCliente } from '@/hooks/useCobranca';
import { useSimularRenegociacao, useConfirmarRenegociacao } from '@/hooks/useRenegociacao';
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
} from '@/types/renegociacao';
import { formatCurrency, formatDate, formatSankhyaDate } from '@/lib/utils';
import { Dialog, DialogHeader, DialogTitle, DialogCloseButton, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Loader2, Calculator, CheckCircle2, AlertTriangle, RefreshCw, Handshake } from 'lucide-react';

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

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [params, setParams] = useState<Omit<RenegociacaoParams, 'nufins'>>(DEFAULT_RENEGOCIACAO_PARAMS);
  const [simulacao, setSimulacao] = useState<SimulacaoResultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoResultado | null>(null);

  useEffect(() => {
    if (open) {
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

  const valorSelecionado = useMemo(
    () => titulosEmAberto.filter((t) => selected.has(t.id)).reduce((sum, t) => sum + t.valorEmAberto, 0),
    [titulosEmAberto, selected],
  );

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
    setErro(null);
    setSimulacao(null);
    try {
      const res = await simular.mutateAsync(buildSimularPayload());
      setSimulacao(res);
    } catch (e: any) {
      setErro(e?.response?.data?.message || e?.message || 'Erro ao simular o parcelamento.');
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
    } catch (e: any) {
      setErro(e?.response?.data?.message || e?.message || 'Erro ao confirmar a renegociação.');
    }
  };

  const allSelected = selected.size === titulosEmAberto.length && titulosEmAberto.length > 0;
  const podeSimular = selected.size > 0 && !simular.isPending;
  const podeConfirmar = !!simulacao && !confirmar.isPending && !confirmacao;
  const totalParcelas = simulacao?.parcelas.length ?? 0;
  const valorTotalParcelas = simulacao?.parcelas.reduce(
    (sum, p) => sum + parseFloat(p.VLRDESDOB ?? '0'),
    0,
  ) ?? 0;

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
            <Handshake className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <DialogTitle>Renegociar Títulos</DialogTitle>
            <p className="mt-0.5 text-xs text-gray-500">{parceiroNome}</p>
          </div>
        </div>
        <DialogCloseButton onClose={onClose} />
      </DialogHeader>

      <DialogContent className="space-y-5">
        {confirmacao ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="h-14 w-14 text-green-500" />
              <p className="mt-3 text-base font-semibold text-gray-900">Renegociação concluída!</p>
              <p className="mt-1 text-sm text-gray-500">
                {confirmacao.parcelasGeradas.length} novo{confirmacao.parcelasGeradas.length !== 1 ? 's' : ''} título{confirmacao.parcelasGeradas.length !== 1 ? 's' : ''} gerado{confirmacao.parcelasGeradas.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200">
              <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
                <span className="text-xs font-semibold text-gray-500">
                  Renegociação Nº {confirmacao.nureneg || '—'}
                </span>
              </div>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-white">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">NUFIN</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Vencimento</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {confirmacao.parcelasGeradas.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-600">{i + 1}</td>
                      <td className="px-3 py-2 text-gray-700">{p.nuFin || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {p.dataVencimento ? formatSankhyaDate(p.dataVencimento) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {formatCurrency(p.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-500" colSpan={3}>Total</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">
                      {formatCurrency(confirmacao.parcelasGeradas.reduce((s, p) => s + p.valor, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <>
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  Títulos em aberto ({titulosEmAberto.length})
                </h3>
                <button
                  onClick={toggleAll}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>

              {loadingTitulos ? (
                <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando títulos...
                </div>
              ) : titulosEmAberto.length === 0 ? (
                <p className="rounded-lg bg-gray-50 py-4 text-center text-sm text-gray-400">
                  Nenhum título em aberto para renegociar.
                </p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-gray-100 p-2">
                  {titulosEmAberto.map((t) => (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggle(t.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">
                            {t.numero ? `#${t.numero}` : `NUFIN ${t.id}`}
                          </span>
                          {t.desdobramento && t.desdobramento !== '0' && (
                            <span className="text-xs text-gray-400">Parc. {t.desdobramento}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">Venc: {formatDate(t.dataVencimento)}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(t.valorEmAberto)}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center justify-between rounded-md bg-indigo-50 px-3 py-2">
                <span className="text-xs font-medium text-indigo-700">
                  {selected.size} título{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}
                </span>
                <span className="text-sm font-bold text-indigo-900">
                  {formatCurrency(valorSelecionado)}
                </span>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Parâmetros do parcelamento</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Nº de parcelas">
                  <Input
                    type="number"
                    min={1}
                    value={params.nroparcel}
                    onChange={(e) => update('nroparcel', Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </Field>
                <Field label="Frequência">
                  <Select value={params.freq} onChange={(e) => update('freq', e.target.value)}>
                    {FREQUENCIA_OPCOES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Vencimento">
                  <Select value={params.venc} onChange={(e) => update('venc', e.target.value)}>
                    {VENCIMENTO_OPCOES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </Field>
                {params.venc === '3' && (
                  <Field label="Data fixa do vencimento">
                    <Input
                      type="date"
                      value={params.novaDataVencimento?.split('/').reverse().join('-') ?? ''}
                      onChange={(e) => {
                        const iso = e.target.value;
                        const parts = iso.split('-');
                        const br = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';
                        update('novaDataVencimento', br);
                      }}
                    />
                  </Field>
                )}
                <Field label="Taxa juros (%)">
                  <Input
                    type="number"
                    step="0.01"
                    value={params.txjur}
                    onChange={(e) => update('txjur', parseFloat(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Taxa multa (%)">
                  <Input
                    type="number"
                    step="0.01"
                    value={params.txmul}
                    onChange={(e) => update('txmul', parseFloat(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Tipo de negociação">
                  <Select value={params.negoc} onChange={(e) => update('negoc', e.target.value)}>
                    {NEGOCIACAO_OPCOES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tipo título (cod)">
                  <Input
                    type="number"
                    value={params.codTipTit}
                    onChange={(e) => update('codTipTit', parseInt(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Empresa novos títulos">
                  <Input
                    type="number"
                    value={params.empresaNovosTitulos}
                    onChange={(e) => update('empresaNovosTitulos', parseInt(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Conta">
                  <Input
                    type="number"
                    value={params.codConta}
                    onChange={(e) => update('codConta', parseInt(e.target.value) || 0)}
                  />
                </Field>
              </div>

              <label className="mt-3 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!params.comEntrada}
                  onChange={(e) => update('comEntrada', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">Parcela com entrada</span>
              </label>
            </section>

            {simulacao && (
              <section className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Resultado da simulação
                  </h3>
                  {totalParcelas > 0 && (
                    <span className="text-xs font-medium text-gray-500">
                      {totalParcelas} parcela{totalParcelas !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {simulacao.parcelas.length > 0 ? (
                  <>
                    <div className="overflow-hidden rounded-md border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-white">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Vencimento</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Valor</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Juros</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Multa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {simulacao.parcelas.map((p: ParcelaSimulada, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 text-gray-600">{p.DESDOBRAMENTO ?? i + 1}</td>
                              <td className="px-3 py-2 text-gray-700">
                                {p.DTVENC ? formatSankhyaDate(p.DTVENC) : '—'}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-900">
                                {formatCurrency(parseFloat(p.VLRDESDOB ?? '0'))}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {formatCurrency(parseFloat(p.VLRJURO ?? '0'))}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {formatCurrency(parseFloat(p.VLRMULTA ?? '0'))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td className="px-3 py-2 text-xs font-semibold text-gray-500" colSpan={2}>Total</td>
                            <td className="px-3 py-2 text-right font-bold text-gray-900">
                              {formatCurrency(valorTotalParcelas)}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Confirme para gerar os novos títulos no Sankhya via RenegociacaoSP.renegociar.
                    </p>
                  </>
                ) : (
                  <p className="py-2 text-xs text-gray-500">
                    Simulação executada, mas nenhuma parcela foi retornada pelo Sankhya.
                  </p>
                )}
              </section>
            )}

            {erro && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-700">{erro}</p>
              </div>
            )}
          </>
        )}
      </DialogContent>

      {!confirmacao && (
        <DialogFooter>
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>

          {simulacao ? (
            <button
              onClick={handleConfirmar}
              disabled={!podeConfirmar}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirmar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirmar Renegociação
            </button>
          ) : (
            <button
              onClick={handleSimular}
              disabled={!podeSimular}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {simular.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : simulacao ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              {simulacao ? 'Resimular' : 'Simular Parcelamento'}
            </button>
          )}
        </DialogFooter>
      )}

      {confirmacao && (
        <DialogFooter>
          <button
            onClick={() => {
              onSuccess?.();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Fechar
          </button>
        </DialogFooter>
      )}
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs text-gray-500">{label}</Label>
      {children}
    </div>
  );
}
