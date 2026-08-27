import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CategoriaTemplateWhatsApp =
  | 'COBRANCA_SOMADA'
  | 'COBRANCA_DETALHADA'
  | 'LEMBRETE'
  | 'RENEGOCIACAO'
  | 'OUTROS';

export interface WhatsAppTemplate {
  id: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaTemplateWhatsApp;
  mensagemTemplate: string;
  incluirDocumentos?: boolean;
  padrao?: boolean;
}

export const TEMPLATES_PADRAO: WhatsAppTemplate[] = [
  {
    id: 'cobranca-amigavel-somada',
    titulo: 'Cobrança Amigável (Valor Somado)',
    descricao: 'Mensagem objetiva e amigável com o valor total somado de todos os títulos em aberto.',
    categoria: 'COBRANCA_SOMADA',
    padrao: true,
    mensagemTemplate:
      'Olá, {primeiro_nome}! Tudo bem?\n\nConstamos em nosso sistema um saldo pendente no valor total de *{valor_total}*, referente a {qtd_titulos} título(s).\n\nVocê poderia nos confirmar a previsão de pagamento? Caso precise da 2ª via do boleto ou PIX, estamos à disposição para ajudar!\n\nAtenciosamente, Financeiro.',
  },
  {
    id: 'cobranca-detalhada',
    titulo: 'Cobrança Detalhada (Por Título)',
    descricao: 'Relação completa linha a linha dos títulos com número do documento, vencimento e valor individual.',
    categoria: 'COBRANCA_DETALHADA',
    padrao: true,
    mensagemTemplate:
      'Olá, {nome_parceiro}!\n\nSegue a relação detalhada dos seus títulos pendentes em nosso sistema:\n\n{lista_titulos_detalhada}\n\n*Total Consolidado:* *{valor_total}*\n*Vencimento mais antigo:* {vencimento_mais_antigo}\n\nPodemos gerar os boletos atualizados para você? Aguardamos seu retorno!',
  },
  {
    id: 'lembrete-vencimento',
    titulo: 'Lembrete de Vencimento (Preventivo)',
    descricao: 'Aviso amigável para lembrete de vencimento próximo ou do dia.',
    categoria: 'LEMBRETE',
    padrao: true,
    mensagemTemplate:
      'Olá, {primeiro_nome}! Passando para lembrar que você possui título(s) no valor total de *{valor_total}* com vencimento para *{vencimento_mais_antigo}*.\n\nCaso precise da 2ª via ou código de barras, responder esta mensagem. Tenha um ótimo dia!',
  },
  {
    id: 'acordo-renegociacao',
    titulo: 'Confirmação de Acordo / Renegociação',
    descricao: 'Mensagem de confirmação de termos acordados e envio de parcelas.',
    categoria: 'RENEGOCIACAO',
    padrao: true,
    mensagemTemplate:
      'Olá, {primeiro_nome}! Conforme conversamos, confirmamos o acordo de renegociação no valor total de *{valor_total}*.\n\n*Resumo dos títulos:*\n{lista_titulos_detalhada}\n\nAgradecemos a parceria e permanecemos à disposição!',
  },
];

interface WhatsAppTemplateState {
  templates: WhatsAppTemplate[];
  templateAtivoId: string;
  setTemplateAtivoId: (id: string) => void;
  addTemplate: (template: Omit<WhatsAppTemplate, 'id' | 'padrao'>) => void;
  updateTemplate: (id: string, updated: Partial<WhatsAppTemplate>) => void;
  removeTemplate: (id: string) => void;
  resetToDefaults: () => void;
}

export const useWhatsAppTemplateStore = create<WhatsAppTemplateState>()(
  persist(
    (set) => ({
      templates: TEMPLATES_PADRAO,
      templateAtivoId: 'cobranca-amigavel-somada',

      setTemplateAtivoId: (id: string) => set({ templateAtivoId: id }),

      addTemplate: (novo) =>
        set((state) => {
          const id = `custom-${Date.now()}`;
          const item: WhatsAppTemplate = {
            ...novo,
            id,
            padrao: false,
          };
          return {
            templates: [...state.templates, item],
            templateAtivoId: id,
          };
        }),

      updateTemplate: (id, updated) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updated } : t
          ),
        })),

      removeTemplate: (id) =>
        set((state) => {
          const novastemplates = state.templates.filter((t) => t.id !== id);
          const fallbackId = novastemplates[0]?.id || 'cobranca-amigavel-somada';
          return {
            templates: novastemplates,
            templateAtivoId:
              state.templateAtivoId === id ? fallbackId : state.templateAtivoId,
          };
        }),

      resetToDefaults: () =>
        set({
          templates: TEMPLATES_PADRAO,
          templateAtivoId: 'cobranca-amigavel-somada',
        }),
    }),
    {
      name: 'whatsapp-templates-storage',
    }
  )
);
