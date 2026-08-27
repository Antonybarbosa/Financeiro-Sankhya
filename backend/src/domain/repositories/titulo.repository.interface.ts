import { Titulo, StatusTitulo } from '../entities/titulo.entity';

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
  primeiroVencimento: Date | null;
  ultimoVencimento: Date | null;
  diasAtrasoMax: number;
  prioridade: number;
  pendente: boolean | null;
}

export interface ResumoFinanceiroParceiro {
  parceiroId: number;
  valorVencido: number;
  diasAtrasoMax: number;
  qtdTitulos: number;
  qtdVencidos: number;
}

export interface ResumoFinanceiroAgregado {
  valorEmAberto: number;
  valorVencido: number;
  valorAvencer7d: number;
  qtdTitulos: number;
  qtdVencidos: number;
  qtdAvencer7d: number;
}

export interface FilaCobrancaResult {
  items: FilaItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilaCobrancaOptions {
  apenasVencidos?: boolean;
  busca?: string;
  page?: number;
  limit?: number;
}

export interface BoletoDados {
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
  dataVencimento: Date;
  dataEmissao: Date;
  juros: number | null;
  jurosTipo: string;
  multa: number | null;
  multaTipo: string;
  sacado: {
    nome: string;
    cnpjCpf: string;
    endereco: string;
    cep: string;
    cidade: string;
    uf: string;
  };
  cedente: {
    nome: string;
    razaoSocial: string;
    cnpjCpf: string;
    endereco: string;
    cep: string;
    cidade: string;
    uf: string;
  };
}

export interface MetasPerformanceRawRow {
  regra: string;
  recebido: number;
  meta: number;
  premio: number;
  percCom: number;
}

export interface ITituloRepository {
  findById(id: number): Promise<Titulo | null>;
  findBoleto(id: number): Promise<BoletoDados | null>;
  findByCliente(clienteId: number): Promise<Titulo[]>;
  findVencidos(diasAtrasoMin?: number, diasAtrasoMax?: number): Promise<Titulo[]>;
  findA_vencer(dias: number): Promise<Titulo[]>;
  findEmAberto(): Promise<Titulo[]>;
  findPorStatus(status: StatusTitulo): Promise<Titulo[]>;
  findPorPeriodo(dataInicio: Date, dataFim: Date): Promise<Titulo[]>;
  findBaixadosPorPeriodo(dataInicio: Date, dataFim: Date): Promise<Titulo[]>;
  findFilaCobranca(opts?: FilaCobrancaOptions): Promise<FilaCobrancaResult>;
  findResumoFinanceiroPorParceiros(parceiroIds: number[]): Promise<ResumoFinanceiroParceiro[]>;
  findResumoFinanceiroAgregado(parceiroIds: number[]): Promise<ResumoFinanceiroAgregado>;
  findMetasPerformance(dtini: string, dtfim: string, codemp?: number): Promise<MetasPerformanceRawRow[]>;
  save(titulo: Titulo): Promise<Titulo>;
  updateStatus(id: number, status: StatusTitulo): Promise<void>;
  countPorStatus(): Promise<{ status: StatusTitulo; total: number; valor: number }[]>;
}
