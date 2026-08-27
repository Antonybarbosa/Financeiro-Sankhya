'use client';

import { useState } from 'react';
import {
  useWhatsAppTemplateStore,
  WhatsAppTemplate,
  CategoriaTemplateWhatsApp,
} from '@/store/whatsappTemplateStore';
import { TAGS_WHATSAPP, interpolarMensagemWhatsApp } from '@/lib/whatsappUtils';
import { toast } from '@/hooks/useToast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  MessageSquare,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Copy,
  Info,
  Check,
} from 'lucide-react';

interface WhatsAppTemplatesConfigModalProps {
  open: boolean;
  onClose: () => void;
}

const SAMPLE_DATA = {
  nomeParceiro: 'Empresa Exemplo LTDA',
  primeiroNome: 'Carlos',
  titulos: [
    {
      id: 101,
      numero: '15420',
      desdobramento: '1',
      dataVencimento: new Date(Date.now() - 15 * 86400000).toISOString(),
      valorEmAberto: 1250.5,
    },
    {
      id: 102,
      numero: '15890',
      desdobramento: '2',
      dataVencimento: new Date(Date.now() - 5 * 86400000).toISOString(),
      valorEmAberto: 850.0,
    },
  ],
};

const CATEGORIAS_ROTULOS: Record<CategoriaTemplateWhatsApp, string> = {
  COBRANCA_SOMADA: 'Cobrança Somada (Resumida)',
  COBRANCA_DETALHADA: 'Cobrança Detalhada (Por Título)',
  LEMBRETE: 'Lembrete de Vencimento',
  RENEGOCIACAO: 'Renegociação / Acordo',
  OUTROS: 'Outros Assuntos',
};

export function WhatsAppTemplatesConfigModal({
  open,
  onClose,
}: WhatsAppTemplatesConfigModalProps) {
  const {
    templates,
    templateAtivoId,
    setTemplateAtivoId,
    addTemplate,
    updateTemplate,
    removeTemplate,
    resetToDefaults,
  } = useWhatsAppTemplateStore();

  const templateAtual =
    templates.find((t) => t.id === templateAtivoId) || templates[0];

  const [editando, setEditando] = useState<Partial<WhatsAppTemplate>>({});
  const [isNovo, setIsNovo] = useState(false);

  // Inicializar formulário ao mudar o template ativo
  const templateExibido = isNovo
    ? editando
    : { ...templateAtual, ...editando };

  const handleSelectTemplate = (id: string) => {
    setIsNovo(false);
    setEditando({});
    setTemplateAtivoId(id);
  };

  const handleIniciarNovo = () => {
    setIsNovo(true);
    setEditando({
      titulo: 'Novo Modelo de Mensagem',
      descricao: 'Modelo personalizado de cobrança',
      categoria: 'COBRANCA_SOMADA',
      mensagemTemplate:
        'Olá, {primeiro_nome}! Seu saldo pendente é de {valor_total}.',
    });
  };

  const handleInsertTag = (tag: string) => {
    const textoAtual = templateExibido.mensagemTemplate || '';
    const novoTexto = `${textoAtual} ${tag} `;
    setEditando((prev) => ({ ...prev, mensagemTemplate: novoTexto }));
  };

  const handleSalvar = () => {
    if (!templateExibido.titulo?.trim()) {
      toast.error('Campo obrigatório', 'Informe o título do modelo.');
      return;
    }
    if (!templateExibido.mensagemTemplate?.trim()) {
      toast.error('Campo obrigatório', 'Informe a mensagem do modelo.');
      return;
    }

    if (isNovo) {
      addTemplate({
        titulo: templateExibido.titulo.trim(),
        descricao: templateExibido.descricao?.trim() || '',
        categoria: (templateExibido.categoria as CategoriaTemplateWhatsApp) || 'COBRANCA_SOMADA',
        mensagemTemplate: templateExibido.mensagemTemplate.trim(),
      });
      setIsNovo(false);
      setEditando({});
      toast.success('Modelo criado!', 'Novo modelo de mensagem salvo com sucesso.');
    } else if (templateAtual) {
      updateTemplate(templateAtual.id, {
        titulo: templateExibido.titulo?.trim(),
        descricao: templateExibido.descricao?.trim(),
        categoria: templateExibido.categoria as CategoriaTemplateWhatsApp,
        mensagemTemplate: templateExibido.mensagemTemplate?.trim(),
      });
      setEditando({});
      toast.success('Modelo atualizado!', 'Alterações salvas com sucesso.');
    }
  };

  const handleExcluir = (id: string) => {
    if (confirm('Deseja realmente excluir este modelo de mensagem?')) {
      removeTemplate(id);
      setIsNovo(false);
      setEditando({});
      toast.success('Modelo removido', 'O modelo foi excluído.');
    }
  };

  const handleRestaurar = () => {
    if (confirm('Deseja restaurar todos os modelos padrão originais? Suas alterações serão redefinidas.')) {
      resetToDefaults();
      setIsNovo(false);
      setEditando({});
      toast.success('Modelos restaurados', 'Os modelos padrão do sistema foram restaurados.');
    }
  };

  // Preview em tempo real da mensagem compilada
  const mensagemPreview = interpolarMensagemWhatsApp(
    templateExibido.mensagemTemplate || '',
    SAMPLE_DATA
  );

  return (
    <Dialog open={open} onClose={onClose} className="max-w-6xl w-full max-h-[92vh]">
      <DialogContent className="p-6 overflow-y-auto">
        <DialogHeader className="border-b border-gray-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900">
                  Modelos de Mensagem do WhatsApp
                </DialogTitle>
                <p className="text-xs text-gray-500">
                  Personalize os textos de cobrança usando variáveis dinâmicas salvas no seu navegador.
                </p>
              </div>
            </div>

            <button
              onClick={handleRestaurar}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700"
              title="Restaurar modelos de fábrica"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar Padrões
            </button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 mt-4">
          {/* Coluna da Esquerda: Lista de Templates Registrados (4 colunas) */}
          <div className="lg:col-span-4 space-y-3 border-r border-gray-100 pr-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Seus Modelos ({templates.length})
              </span>
              <button
                onClick={handleIniciarNovo}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Novo Modelo
              </button>
            </div>

            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
              {templates.map((t) => {
                const isSelected = !isNovo && t.id === templateAtivoId;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTemplate(t.id)}
                    className={`group relative flex cursor-pointer flex-col rounded-xl border p-3 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-900 truncate pr-2">
                        {t.titulo}
                      </p>
                      {t.padrao && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500 shrink-0">
                          Padrão
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">
                      {t.descricao || t.mensagemTemplate}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna Central/Direita: Editor e Preview em Tempo Real (8 colunas) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  {isNovo ? 'Criar Novo Modelo' : 'Editar Modelo Selecionado'}
                </h3>

                {!isNovo && !templateAtual?.padrao && (
                  <button
                    onClick={() => handleExcluir(templateAtual.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                )}
              </div>

              {/* Formulário do Modelo */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Título do Modelo</Label>
                  <Input
                    value={templateExibido.titulo || ''}
                    onChange={(e) =>
                      setEditando((prev) => ({ ...prev, titulo: e.target.value }))
                    }
                    placeholder="Ex: Cobrança Amigável 15 dias"
                    className="text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Categoria</Label>
                  <Select
                    value={templateExibido.categoria || 'COBRANCA_SOMADA'}
                    onChange={(e) =>
                      setEditando((prev) => ({
                        ...prev,
                        categoria: e.target.value as CategoriaTemplateWhatsApp,
                      }))
                    }
                    className="text-xs font-semibold"
                  >
                    {Object.entries(CATEGORIAS_ROTULOS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Descrição Curta */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Descrição Rápida (Opcional)</Label>
                <Input
                  value={templateExibido.descricao || ''}
                  onChange={(e) =>
                    setEditando((prev) => ({ ...prev, descricao: e.target.value }))
                  }
                  placeholder="Explique resumidamente a finalidade deste texto..."
                  className="text-xs text-gray-600"
                />
              </div>

              {/* Inserção de Tags Dinâmicas (Chips) */}
              <div className="space-y-1.5 bg-gray-50/70 p-3 rounded-xl border border-gray-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Clique em uma tag para inserir no texto:
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {TAGS_WHATSAPP.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handleInsertTag(t.tag)}
                      title={t.descricao}
                      className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                    >
                      + {t.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea do Modelo */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">
                  Texto da Mensagem (suporta negrito `*texto*` e itálico `_texto_`)
                </Label>
                <textarea
                  rows={10}
                  value={templateExibido.mensagemTemplate || ''}
                  onChange={(e) =>
                    setEditando((prev) => ({
                      ...prev,
                      mensagemTemplate: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 p-3 text-xs font-mono text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Digite o modelo de mensagem..."
                />
              </div>

              {/* Botão de Salvar Alterações */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSalvar}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isNovo ? 'Salvar Novo Modelo' : 'Salvar Alterações'}
                </button>
              </div>
            </div>

            {/* Painel de Preview Realista no WhatsApp */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-950/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 border-b border-emerald-200/60 pb-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                Pré-visualização da Mensagem (WhatsApp Live Preview)
              </div>

              <div className="rounded-lg bg-[#E5DDD5] p-3 shadow-inner min-h-[100px]">
                <div className="ml-auto max-w-[90%] rounded-lg bg-[#DCF8C6] p-3 shadow-xs text-xs font-sans text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {mensagemPreview || 'Nenhum texto no modelo.'}
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-gray-500">
                    <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <Check className="h-3 w-3 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-gray-100 pt-3 mt-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            Fechar Central
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
