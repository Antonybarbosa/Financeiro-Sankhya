export interface Agendamento {
  nuFin: number;
  codparc: number;
  nomeParceiro: string;
  razaoSocial?: string;
  numnota: number;
  numdupl: number | null;
  desdobramento: string;
  dataVencimento: string;
  dataNegociacao: string;
  valor: number;
  valorEmAberto: number;
  valorBaixado: number;
  baixado: boolean;
  tipo: string;
  historico: string;
  codemp: number;
}

export interface AgendaResponse {
  data: Agendamento[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  dataConsulta: string;
  totalReceber: number;
  totalPagar: number;
}

export interface AgendaParams {
  page?: number;
  limit?: number;
}
