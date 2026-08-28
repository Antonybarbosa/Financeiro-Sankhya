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
  MetasPerformanceResponse,
  MetasPerformanceParams,
} from '@/types/cobranca';
import { NfeDados } from '@/types/nfe';
import { RenegociacaoParams, ConfirmarPayload, SimulacaoResultado, ConfirmacaoResultado } from '@/types/renegociacao';
import {
  Cliente,
  ClienteFiltros,
  CreateClientePayload,
  UpdateClientePayload,
  ClienteListResponse,
  EmpresaParceiro,
  TabelaPreco,
  ClienteAnexo,
} from '@/types/cliente';
import { useAuthStore } from '@/store/authStore';

export const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
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

      if (!sankhyaResponse.data.success || !responseData) {
        return {
          success: false,
          error: sankhyaResponse.data.message || 'Credenciais inválidas ou erro no servidor Sankhya',
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

  async getMetasPerformance(params: MetasPerformanceParams = {}): Promise<MetasPerformanceResponse> {
    const query: Record<string, string> = {};
    if (params.mes) query.mes = String(params.mes);
    if (params.ano) query.ano = String(params.ano);
    if (params.codemp) query.codemp = String(params.codemp);
    const response = await api.get<MetasPerformanceResponse>('/api/cobranca/dashboard/metas-performance', {
      params: query,
    });
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
    const response = await api.post<SimulacaoResultado>('/api/renegociacao/simular', params, {
      timeout: 120000,
    });
    return response.data;
  },

  async confirmar(payload: ConfirmarPayload): Promise<ConfirmacaoResultado> {
    const response = await api.post<ConfirmacaoResultado>('/api/renegociacao/confirmar', payload, {
      timeout: 180000,
    });
    return response.data;
  },
};

export const clienteApi = {
  async getClientes(filtros: ClienteFiltros = {}, page = 1, limit = 50): Promise<ClienteListResponse> {
    const params: Record<string, string> = {};
    if (filtros.nome) params.nome = filtros.nome;
    if (filtros.cnpjCpf) params.cnpjCpf = filtros.cnpjCpf;
    if (filtros.situacao) params.situacao = filtros.situacao;
    if (filtros.ativo) params.ativo = filtros.ativo;
    params.page = String(page);
    params.limit = String(limit);
    const response = await api.get<ClienteListResponse>('/api/clientes', { params });
    return response.data;
  },

  async getCidades(query: string): Promise<Array<{ codCid: number; nomeCidade: string; uf: string }>> {
    const response = await api.get('/api/clientes/enderecos/cidades', { params: { query } });
    return response.data;
  },

  async getBairros(query: string): Promise<Array<{ codBai: number; nomeBairro: string }>> {
    const response = await api.get('/api/clientes/enderecos/bairros', { params: { query } });
    return response.data;
  },

  async getLogradouros(query: string): Promise<Array<{ codEnd: number; nomeEnd: string }>> {
    const response = await api.get('/api/clientes/enderecos/logradouros', { params: { query } });
    return response.data;
  },

  async getBancos(query: string): Promise<Array<{ codBco: number; nomeBco: string }>> {
    const response = await api.get('/api/clientes/bancos', { params: { query } });
    return response.data;
  },

  async getTiposParceiro(query: string): Promise<Array<{ codTipParc: number; nomeTipParc: string }>> {
    const response = await api.get('/api/clientes/tipos-parceiro', { params: { query } });
    return response.data;
  },

  async getRegioes(query: string): Promise<Array<{ codReg: number; nomeReg: string }>> {
    const response = await api.get('/api/clientes/regioes', { params: { query } });
    return response.data;
  },

  async getClienteCount(): Promise<{ total: number }> {
    const response = await api.get<{ total: number }>('/api/clientes/count');
    return response.data;
  },

  async getClienteByCnpj(cnpjCpf: string): Promise<Cliente[]> {
    const response = await api.get<Cliente[]>(`/api/clientes/buscar/cnpj/${encodeURIComponent(cnpjCpf)}`);
    return response.data;
  },

  async getClienteById(codParc: number): Promise<Cliente> {
    const response = await api.get<Cliente>(`/api/clientes/${codParc}`);
    return response.data;
  },

  async criarCliente(payload: CreateClientePayload): Promise<Cliente> {
    const response = await api.post<Cliente>('/api/clientes', payload);
    return response.data;
  },

  async atualizarCliente(codParc: number, payload: UpdateClientePayload): Promise<Cliente> {
    const response = await api.put<Cliente>(`/api/clientes/${codParc}`, payload);
    return response.data;
  },

  async validarDocumento(cnpjCpf: string, codParc?: number): Promise<{ existe: boolean; mensagem?: string }> {
    const response = await api.get<{ existe: boolean; mensagem?: string }>(
      `/api/clientes/validar-documento/${encodeURIComponent(cnpjCpf)}`,
      { params: codParc ? { codParc } : {} },
    );
    return response.data;
  },

  async deletarCliente(codParc: number): Promise<{ mensagem: string }> {
    const response = await api.delete<{ mensagem: string }>(`/api/clientes/${codParc}`);
    return response.data;
  },

  async getEmpresasParceiro(codParc: number): Promise<EmpresaParceiro[]> {
    const response = await api.get<EmpresaParceiro[]>(`/api/clientes/${codParc}/empresas`);
    return response.data;
  },

  async getEmpresasDisponiveis(): Promise<Array<{ codEmp: number; nomeEmp: string }>> {
    const response = await api.get<Array<{ codEmp: number; nomeEmp: string }>>('/api/clientes/empresas/disponiveis');
    return response.data;
  },

  async getTabelasPrecoDisponiveis(): Promise<TabelaPreco[]> {
    const response = await api.get<TabelaPreco[]>('/api/clientes/tabelas-preco/disponiveis');
    return response.data;
  },

  async salvarEmpresaParceiro(
    codParc: number,
    payload: {
      codEmp: number;
      codTab?: number;
      classificIcms?: string;
    },
  ): Promise<void> {
    await api.post(`/api/clientes/${codParc}/empresas`, payload);
  },

  async removerEmpresaParceiro(codParc: number, codEmp: number): Promise<void> {
    await api.delete(`/api/clientes/${codParc}/empresas/${codEmp}`);
  },

  async getAnexosParceiro(codParc: number): Promise<ClienteAnexo[]> {
    const response = await api.get<ClienteAnexo[]>(`/api/clientes/${codParc}/anexos`);
    return response.data;
  },

  async salvarAnexoParceiro(
    codParc: number,
    payload: { nomeArquivo: string; descricao?: string },
  ): Promise<ClienteAnexo> {
    const response = await api.post<ClienteAnexo>(`/api/clientes/${codParc}/anexos`, payload);
    return response.data;
  },

  async uploadAnexoParceiro(codParc: number, arquivo: File, descricao?: string): Promise<ClienteAnexo> {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    if (descricao) formData.append('descricao', descricao);
    const response = await api.post<ClienteAnexo>(`/api/clientes/${codParc}/anexos/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async baixarAnexoParceiro(codParc: number, sequencia: number, fonte: string, nomeArquivo?: string): Promise<Blob> {
    const params: Record<string, string> = { fonte };
    if (nomeArquivo) params['nomeArquivo'] = nomeArquivo;

    const response = await api.get(`/api/clientes/${codParc}/anexos/${sequencia}/arquivo`, {
      params,
      responseType: 'blob',
      validateStatus: (status) => status < 500,
    });

    if (response.status >= 400) {
      let mensagem = 'Arquivo do anexo não disponível.';
      try {
        if (response.data instanceof Blob) {
          const txt = await response.data.text();
          const parsed = JSON.parse(txt);
          if (parsed?.message) mensagem = parsed.message;
          else if (txt) mensagem = txt;
        } else if (typeof response.data === 'string') {
          const parsed = JSON.parse(response.data);
          if (parsed?.message) mensagem = parsed.message;
        } else if (response.data && typeof response.data === 'object' && (response.data as any).message) {
          mensagem = (response.data as any).message;
        }
      } catch {
        /* mantém mensagem padrão */
      }
      throw new Error(`[HTTP ${response.status}] ${mensagem}`);
    }

    return response.data;
  },

  async removerAnexoParceiro(codParc: number, sequencia: number, fonte: string, descricao?: string): Promise<void> {
    const params: Record<string, string> = { fonte };
    if (descricao) params['descricao'] = descricao;
    await api.delete(`/api/clientes/${codParc}/anexos/${sequencia}`, { params });
  },

  async buscarCep(cep: string): Promise<CepResult | null> {
    return buscarCepViaApi(cep);
  },
};

export interface CepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude?: string;
  longitude?: string;
  codEnd?: number;
  codBai?: number;
  codCid?: number;
  encontradoNoSankhya?: boolean;
}

export async function buscarCepViaApi(cep: string): Promise<CepResult | null> {
  const clean = (cep || '').replace(/\D/g, '');
  if (clean.length !== 8) return null;

  // 1. Tenta buscar primeiro no banco do Sankhya (tabela TSICEP) via backend
  try {
    const resSankhya = await api.get(`/api/clientes/enderecos/cep/${clean}`);
    if (resSankhya.data && resSankhya.data.encontradoNoSankhya) {
      const d = resSankhya.data;
      return {
        cep: d.cep || clean,
        logradouro: d.logradouro || '',
        complemento: '',
        bairro: d.bairro || '',
        cidade: d.cidade || '',
        uf: d.uf || '',
        codEnd: d.codEnd,
        codBai: d.codBai,
        codCid: d.codCid,
        encontradoNoSankhya: true,
      };
    }
  } catch {
    // Caso não encontre no TSICEP, segue para busca externa ViaCEP / BrasilAPI
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        let latitude: string | undefined;
        let longitude: string | undefined;
        try {
          const resBrasil = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`);
          if (resBrasil.ok) {
            const dataBrasil = await resBrasil.json();
            if (dataBrasil.location?.coordinates) {
              latitude = dataBrasil.location.coordinates.latitude ? String(dataBrasil.location.coordinates.latitude) : undefined;
              longitude = dataBrasil.location.coordinates.longitude ? String(dataBrasil.location.coordinates.longitude) : undefined;
            }
          }
        } catch {
          // ignore
        }

        return {
          cep: data.cep || clean,
          logradouro: data.logradouro || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || '',
          latitude,
          longitude,
        };
      }
    }
  } catch (err) {
    console.error('Erro no ViaCEP:', err);
  }

  try {
    const resBrasil = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`);
    if (resBrasil.ok) {
      const data = await resBrasil.json();
      return {
        cep: clean,
        logradouro: data.street || '',
        complemento: '',
        bairro: data.neighborhood || '',
        cidade: data.city || '',
        uf: data.state || '',
        latitude: data.location?.coordinates?.latitude ? String(data.location.coordinates.latitude) : undefined,
        longitude: data.location?.coordinates?.longitude ? String(data.location.coordinates.longitude) : undefined,
      };
    }
  } catch (err) {
    console.error('Erro na BrasilAPI:', err);
  }

  return null;
}

export async function buscarCoordenadasPorEndereco(params: {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}): Promise<{ latitude: string; longitude: string } | null> {
  const parts = [
    params.logradouro,
    params.numero,
    params.bairro,
    params.cidade,
    params.uf,
    params.cep,
    'Brasil',
  ].filter(Boolean);

  if (parts.length < 2) return null;

  try {
    const query = encodeURIComponent(parts.join(', '));
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`, {
      headers: {
        'User-Agent': 'FinanceiroSankhya/1.0',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          latitude: String(data[0].lat),
          longitude: String(data[0].lon),
        };
      }
    }
  } catch (err) {
    console.error('Erro ao geocodificar endereço:', err);
  }

  if (params.cep) {
    const cleanCep = params.cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const resBrasil = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
        if (resBrasil.ok) {
          const dataBrasil = await resBrasil.json();
          if (dataBrasil.location?.coordinates?.latitude && dataBrasil.location?.coordinates?.longitude) {
            return {
              latitude: String(dataBrasil.location.coordinates.latitude),
              longitude: String(dataBrasil.location.coordinates.longitude),
            };
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return null;
}

export interface CnpjPublicoResult {
  cnpj: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  inscricaoEstadual?: string;
  situacaoCadastral?: string;
}

export async function consultarCnpjPublico(cnpj: string): Promise<CnpjPublicoResult | null> {
  const clean = (cnpj || '').replace(/\D/g, '');
  if (clean.length !== 14) return null;

  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${clean}`);
    if (res.ok) {
      const data = await res.json();
      const est = data.estabelecimento || {};
      const ie = Array.isArray(est.inscricoes_estaduais) && est.inscricoes_estaduais.length > 0
        ? est.inscricoes_estaduais[0].inscricao_estadual
        : undefined;

      return {
        cnpj: clean,
        razaoSocial: data.razao_social || '',
        nomeFantasia: est.nome_fantasia || data.razao_social || '',
        logradouro: est.logradouro ? `${est.tipo_logradouro ? est.tipo_logradouro + ' ' : ''}${est.logradouro}` : '',
        numero: est.numero || '',
        complemento: est.complemento || '',
        bairro: est.bairro || '',
        cidade: est.cidade?.nome || '',
        uf: est.estado?.sigla || '',
        cep: est.cep || '',
        telefone: est.ddd1 && est.telefone1 ? `${est.ddd1}${est.telefone1}` : undefined,
        email: est.email || undefined,
        inscricaoEstadual: ie,
        situacaoCadastral: est.situacao_cadastral,
      };
    }
  } catch {
    // fallback para BrasilAPI
  }

  try {
    const resBrasil = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
    if (resBrasil.ok) {
      const data = await resBrasil.json();
      return {
        cnpj: clean,
        razaoSocial: data.razao_social || '',
        nomeFantasia: data.nome_fantasia || data.razao_social || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.municipio || '',
        uf: data.uf || '',
        cep: data.cep || '',
        telefone: data.ddd_telefone_1 || undefined,
        email: data.email || undefined,
      };
    }
  } catch (err) {
    console.error('Erro ao consultar CNPJ público:', err);
  }

  return null;
}

export default api;