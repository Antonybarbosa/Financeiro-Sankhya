export type StatusTitulo =
  | 'PENDENTE'
  | 'VENCIDO'
  | 'PAGO'
  | 'BAIXADO'
  | 'BAIXA_PARCIAL'
  | 'CANCELADO'
  | 'NEGOCIADO';

export type TipoContato =
  | 'TELEFONE'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'BOLETO'
  | 'SMS'
  | 'OUTRO';

export type SituacaoContato =
  | 'PENDENTE'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export type TipoView = 'master-detail' | 'kanban' | 'tabela';

export interface FilaCobrancaResult {
  items: FilaItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilaCobrancaParams {
  apenasVencidos?: boolean;
  busca?: string;
  page?: number;
  limit?: number;
}

export interface FilaItem {
  parceiroId: number;
  parceiroNome: string;
  telefone: string | null;
  email: string | null;
  cnpjCpf: string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  tipoPessoa?: string | null;
  pessoFisJur?: string | null;
  inscricaoEstadual?: string | null;
  logradouro?: string | null;
  numeroEnd?: string | null;
  complemento?: string | null;
  cep?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  qtdTitulos: number;
  qtdVencidos: number;
  qtdAvencer: number;
  valorTotal: number;
  valorVencido: number;
  valorAvencer: number;
  primeiroVencimento: string | null;
  ultimoVencimento: string | null;
  diasAtrasoMax: number;
  prioridade: number;
  pendente: boolean | null;
}

export interface Titulo {
  id: number;
  nuNota: number | null;
  numero: string;
  numeroDupl: number | null;
  serie: string;
  desdobramento: string;
  clienteId: number;
  clienteNome: string;
  empresa: number;
  valor: number;
  valorBaixado: number;
  valorDesconto: number;
  valorJuros: number;
  valorMulta: number;
  valorEmAberto: number;
  dataVencimento: string;
  dataEmissao: string;
  dataBaixa: string | null;
  recDesp: number;
  status: StatusTitulo;
  historico?: string;
  nossoNumero?: string;
  codigoBarras?: string;
  linhaDigitavel?: string;
  nureneg?: number | null;
  hasNfe?: boolean;
  isVencido: boolean;
  isEmAberto: boolean;
  diasParaVencimento: number;
  diasVencido: number;
}

export interface Contato {
  id: number;
  parceiroId: number;
  parceiroNome: string;
  dataChamada: string;
  proximaChamada: string | null;
  tipo: TipoContato;
  historico: string | null;
  comentarios: string | null;
  comentarios2: string | null;
  mensagem: string | null;
  pendente: boolean;
  situacao: SituacaoContato;
  usuarioId: number;
  usuarioNome: string | null;
  atendenteId: number;
  atendenteNome: string | null;
  vendedorId: number | null;
  nuFin: number | null;
  dataAlteracao: string | null;
}

export interface DashboardKpis {
  totalTitulos: number;
  totalVencidos: number;
  totalA_vencer: number;
  totalBaixados: number;
  valorEmAberto: number;
  valorVencido: number;
  valorA_vencer: number;
  valorBaixado: number;
  cobrancasPendentes: number;
  cobrancasEnviadas: number;
  cobrancasFalhas: number;
  contatosPendentes: number;
  atendidosHoje: number;
  totalAtendimentosHoje: number;
}

export interface AtendimentoHojeItem {
  parceiroId: number;
  parceiroNome: string;
  telefone: string | null;
  email: string | null;
  cnpjCpf: string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  tipoPessoa?: string | null;
  pessoFisJur?: string | null;
  inscricaoEstadual?: string | null;
  logradouro?: string | null;
  numeroEnd?: string | null;
  complemento?: string | null;
  cep?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  pendente: boolean;
  nurel: number;
  totalContatos: number;
  ultimoContato: Contato;
  valorVencido?: number;
  diasAtrasoMax?: number;
  qtdTitulos?: number;
  qtdVencidos?: number;
}

export interface AtendimentoHojeKpis {
  valorEmAberto: number;
  valorVencido: number;
  valorAvencer7d: number;
  qtdTitulos: number;
  qtdVencidos: number;
  qtdAvencer7d: number;
}

export interface AtendimentoHojeResponse {
  items: AtendimentoHojeItem[];
  total: number;
  pendentes: number;
  resolvidos: number;
  kpis: AtendimentoHojeKpis;
}

export interface CreateContatoPayload {
  parceiroId: number;
  tipo: TipoContato;
  comentarios?: string;
  mensagem?: string;
  proximaChamada?: string;
  situacao?: SituacaoContato;
  pendente?: boolean;
  nuFin?: number;
}

export interface BoletoSacado {
  nome: string;
  cnpjCpf: string;
  endereco: string;
  cep: string;
  cidade: string;
  uf: string;
}

export interface BoletoCedente {
  nome: string;
  razaoSocial: string;
  cnpjCpf: string;
  endereco: string;
  cep: string;
  cidade: string;
  uf: string;
}

export interface Boleto {
  tituloId: number;
  parceiroId: number;
  numeroDocumento: string;
  desdobramento: string;
  nossoNumero: string;
  codigoBarras: string;
  linhaDigitavel: string;
  codigoBanco: string;
  carteira: string;
  agencia: string;
  convenio: string;
  diasProtesto: number | null;
  valor: number;
  desconto: number;
  dataVencimento: string;
  dataEmissao: string;
  juros: number | null;
  jurosTipo: string;
  multa: number | null;
  multaTipo: string;
  sacado: BoletoSacado;
  cedente: BoletoCedente;
}

export interface MetasPerformanceItem {
  regra: string;
  recebido: number;
  meta: number;
  percCom: number;
  premio: number;
  percAtingido: number;
}

export interface MetasPerformanceResponse {
  items: MetasPerformanceItem[];
  totais: {
    totalRecebido: number;
    totalMeta: number;
    totalPremio: number;
    percAtingidoGlobal: number;
  };
  mes: number;
  ano: number;
  codemp?: number | null;
  dtini: string;
  dtfim: string;
}

export interface MetasPerformanceParams {
  mes?: number;
  ano?: number;
  codemp?: number;
}

