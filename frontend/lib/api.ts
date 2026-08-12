import axios, { AxiosError } from 'axios';
import { LoginCredentials, LoginResponse, SankhyaLoginResponse, User } from '@/types/auth';
import { AgendaResponse, AgendaParams } from '@/types/agenda';
import {
  FilaItem,
  FilaCobrancaResult,
  FilaCobrancaParams,
  Titulo,
  Contato,
  DashboardKpis,
  CreateContatoPayload,
  SituacaoContato,
  Boleto,
  AtendimentoHojeResponse,
} from '@/types/cobranca';
import { NfeDados } from '@/types/nfe';
import { RenegociacaoParams, ConfirmarPayload, SimulacaoResultado, ConfirmacaoResultado } from '@/types/renegociacao';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().user?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const store = useAuthStore.getState();
      if (store.isAuthenticated) {
        store.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('Iniciando login:', { username: credentials.username });
      
      // Primeiro, faz login no Sankhya
      const sankhyaResponse = await api.post<{ success: boolean; data?: SankhyaLoginResponse; message?: string }>('/api/auth/sankhya-login', {
        username: credentials.username,
        password: credentials.password,
      });

      console.log('Resposta do backend:', sankhyaResponse.data);

      // Backend retorna { success: true, data: {...} }
      // Acessar os dados diretamente de sankhyaResponse.data.data
      const responseData = sankhyaResponse.data.data;

      if (!responseData) {
        return {
          success: false,
          error: 'Resposta inválida do servidor Sankhya',
        };
      }

      // Decodificar o CODUSU que vem em Base64 (fallback se backend não trouxer)
      const codusuBase64 = responseData.idusu.$;
      const codusu = responseData.codusu ?? parseInt(atob(codusuBase64), 10);

      const user: User = {
        id: responseData.callID.$,
        username: credentials.username,
        name: responseData.username || credentials.username,
        codusu,
        token: responseData.appToken || responseData.jsessionid.$,
      };

      console.log('Login bem-sucedido:', user);

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('Erro no login:', error);
      if (error instanceof AxiosError) {
        const message = error.response?.data?.message || error.message;
        console.error('Detalhes do erro Axios:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
        });
        return {
          success: false,
          error: message || 'Erro ao fazer login',
        };
      }
      return {
        success: false,
        error: 'Erro desconhecido ao fazer login',
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  },

  async validateSession(): Promise<boolean> {
    try {
      const response = await api.get('/api/auth/validate');
      return response.data.valid;
    } catch (error) {
      return false;
    }
  },
};

export const agendaApi = {
  async getAgendaHoje(params: AgendaParams = {}): Promise<AgendaResponse> {
    const query: Record<string, string> = {};
    if (params.page) query.page = String(params.page);
    if (params.limit) query.limit = String(params.limit);
    const response = await api.get<AgendaResponse>('/api/agenda/hoje', { params: query });
    return response.data;
  },
};

export const cobrancaApi = {
  async getKpis(): Promise<DashboardKpis> {
    const response = await api.get<DashboardKpis>('/api/cobranca/dashboard/kpis');
    return response.data;
  },

  async getFila(params: FilaCobrancaParams = {}): Promise<FilaCobrancaResult> {
    const query: Record<string, string> = {};
    if (params.apenasVencidos) query.apenasVencidos = 'true';
    if (params.busca) query.q = params.busca;
    if (params.page) query.page = String(params.page);
    if (params.limit) query.limit = String(params.limit);
    const response = await api.get<FilaCobrancaResult>('/api/cobranca/fila', { params: query });
    return response.data;
  },

  async getTitulosPorCliente(clienteId: number): Promise<Titulo[]> {
    const response = await api.get<Titulo[]>(`/api/cobranca/titulos/cliente/${clienteId}`);
    return response.data;
  },

  async getTitulosEmAberto(): Promise<Titulo[]> {
    const response = await api.get<Titulo[]>('/api/cobranca/titulos/em-aberto');
    return response.data;
  },

  async getTitulosVencidos(): Promise<Titulo[]> {
    const response = await api.get<Titulo[]>('/api/cobranca/titulos/vencidos');
    return response.data;
  },

  async getBoleto(tituloId: number): Promise<Boleto> {
    const response = await api.get<Boleto>(`/api/cobranca/titulos/${tituloId}/boleto`);
    return response.data;
  },

  async getContatosPorParceiro(parceiroId: number): Promise<Contato[]> {
    const response = await api.get<Contato[]>(`/api/cobranca/contatos/parceiro/${parceiroId}`);
    return response.data;
  },

  async getContatosPendentes(): Promise<Contato[]> {
    const response = await api.get<Contato[]>('/api/cobranca/contatos', {
      params: { pendentes: 'true' },
    });
    return response.data;
  },

  async criarContato(payload: CreateContatoPayload): Promise<Contato> {
    const response = await api.post<Contato>('/api/cobranca/contatos', payload);
    return response.data;
  },

  async concluirContato(id: number): Promise<void> {
    await api.put(`/api/cobranca/contatos/${id}/concluir`);
  },

  async marcarPendenteContato(id: number): Promise<void> {
    await api.put(`/api/cobranca/contatos/${id}/pendente`);
  },

  async atualizarSituacaoContato(id: number, situacao: SituacaoContato): Promise<void> {
    await api.put(`/api/cobranca/contatos/${id}/situacao`, { situacao });
  },

  async getAtendimentosHoje(): Promise<AtendimentoHojeResponse> {
    const response = await api.get<AtendimentoHojeResponse>('/api/cobranca/atendimento/hoje');
    return response.data;
  },
};

export const nfeApi = {
  async getDadosByNunota(nunota: number): Promise<NfeDados> {
    const response = await api.get<NfeDados>(`/api/nfe/${nunota}`);
    return response.data;
  },

  async getDadosByNumNota(numnota: number): Promise<NfeDados> {
    const response = await api.get<NfeDados>(`/api/nfe/${numnota}`, {
      params: { tipo: 'numnota' },
    });
    return response.data;
  },

  getXmlUrl(nunota: number): string {
    return `/api/nfe/${nunota}/xml`;
  },
};

export const renegociacaoApi = {
  async simular(params: RenegociacaoParams): Promise<SimulacaoResultado> {
    const response = await api.post<SimulacaoResultado>('/api/renegociacao/simular', params);
    return response.data;
  },

  async confirmar(payload: ConfirmarPayload): Promise<ConfirmacaoResultado> {
    const response = await api.post<ConfirmacaoResultado>('/api/renegociacao/confirmar', payload);
    return response.data;
  },
};

export default api;