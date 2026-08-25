import { Cliente, SituacaoCliente, TipoPessoa } from '../entities/cliente.entity';

export interface CreateClienteDto {
  nomeParc: string;
  razaoSocial?: string;
  cnpjCpf?: string;
  tipoPessoa: TipoPessoa;
  telefone?: string;
  email?: string;
  inscricaoEstadual?: string;
  prazoPag?: number;
  limiteCredito?: number;
  observacoes?: string;
  limiteCreditoMensal?: number;
  qtdMaxTitVencidos?: number;
  codTab?: string;
  codVend?: number;
  codBco?: number;
  descBonif?: string;
  descFin?: number;
  inscricaoMunicipal?: string;
  classificacaoIcms?: string;
  retemIss?: string;
  retemInss?: string;
  retemPis?: string;
  retemCofins?: string;
  retemCsl?: string;
  adCredCli?: number;
  adLimitePar?: number;
  adLocalCad?: string;
  adEndCompleto?: string;
  adCodBcoBol?: number;
  adDtUltCompra?: string;
  simples?: string;
  perfilEconect?: string;
  tipoFatur?: string;
  regimeEspTribIss?: string;
  tipoClienteServCom?: string;
  emailNotifEntrega?: string;
  entregaEndContato?: string;
  exigContatoEntCab?: string;
  endereco?: {
    codEnd?: number;
    codBai?: number;
    codCid?: number;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };
}

export interface UpdateClienteDto {
  nomeParc?: string;
  razaoSocial?: string;
  cnpjCpf?: string;
  tipoPessoa?: TipoPessoa;
  situacao?: SituacaoCliente;
  telefone?: string;
  email?: string;
  inscricaoEstadual?: string;
  prazoPag?: number;
  limiteCredito?: number;
  observacoes?: string;
  limiteCreditoMensal?: number;
  qtdMaxTitVencidos?: number;
  codTab?: string;
  codVend?: number;
  codBco?: number;
  descBonif?: string;
  descFin?: number;
  inscricaoMunicipal?: string;
  classificacaoIcms?: string;
  retemIss?: string;
  retemInss?: string;
  retemPis?: string;
  retemCofins?: string;
  retemCsl?: string;
  adCredCli?: number;
  adLimitePar?: number;
  adLocalCad?: string;
  adEndCompleto?: string;
  adCodBcoBol?: number;
  adDtUltCompra?: string;
  simples?: string;
  perfilEconect?: string;
  tipoFatur?: string;
  regimeEspTribIss?: string;
  tipoClienteServCom?: string;
  emailNotifEntrega?: string;
  entregaEndContato?: string;
  exigContatoEntCab?: string;
  latitude?: string;
  longitude?: string;
  latitudeEntrega?: string;
  longitudeEntrega?: string;
  ativo?: string;
  codTipParc?: number;
  codReg?: number;
  dtCad?: string;
  dtAlter?: string;
  grupoAutor?: number;
  bloquear?: string;
  motBloq?: string;
  tipAnexoNfe?: string;
  emailDanfe?: string;
  emailNfe?: string;
  adDtAprovRep?: string;
  enderecoEntrega?: {
    codEnd?: number;
    codBai?: number;
    codCid?: number;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    nomeContato?: string;
  };
  endereco?: {
    codEnd?: number;
    codBai?: number;
    codCid?: number;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };
}

export interface FindAllClientesResult {
  clientes: Cliente[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Fonte de origem do anexo */
export type AnexoFonte = 'TSIATA' | 'TSIANX';

export interface ClienteAnexoDto {
  /** Para TSIANX: NUATTACH global. Para TSIATA: SEQUENCIA do parceiro. */
  nuAttach: number;
  /** Fonte da tabela de origem */
  fonte: AnexoFonte;
  nomeArquivo: string;
  descricao?: string;
  dataCadastro?: string;
  tipoAcesso?: string;
  tipoApres?: string;
  chaveArquivo?: string;
  /** Tamanho do BLOB em bytes (apenas para TSIATA com conteúdo) */
  tamanhoBytes?: number;
}

export interface AnexoArquivoDto {
  buffer: Buffer;
  contentType: string;
  nomeArquivo: string;
  downloadUrl?: string;
}

export interface IClienteRepository {
  findAll(
    filtros?: { nome?: string; cnpjCpf?: string; situacao?: SituacaoCliente; ativo?: 'S' | 'N' },
    page?: number,
    limit?: number,
  ): Promise<FindAllClientesResult>;
  findById(codParc: number): Promise<Cliente | null>;
  findByCnpjCpf(cnpjCpf: string, exato?: boolean): Promise<Cliente[]>;
  buscarCidades(query: string): Promise<Array<{ codCid: number; nomeCidade: string; uf: string }>>;
  buscarBairros(query: string): Promise<Array<{ codBai: number; nomeBairro: string }>>;
  buscarLogradouros(query: string): Promise<Array<{ codEnd: number; nomeEnd: string }>>;
  buscarBancos(query: string): Promise<Array<{ codBco: number; nomeBco: string }>>;
  buscarTiposParceiro(query: string): Promise<Array<{ codTipParc: number; nomeTipParc: string }>>;
  buscarRegioes(query: string): Promise<Array<{ codReg: number; nomeReg: string }>>;
  buscarCep(cep: string): Promise<{
    encontradoNoSankhya: boolean;
    cep: string;
    logradouro?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    codEnd?: number;
    codBai?: number;
    codCid?: number;
  } | null>;
  create(dto: CreateClienteDto): Promise<Cliente>;
  update(codParc: number, dto: UpdateClienteDto): Promise<Cliente>;
  delete(codParc: number): Promise<void>;
  count(): Promise<number>;
  validarDocumentoExistente(cgcCpf: string, codParc?: number): Promise<{ existe: boolean; mensagem?: string }>;
  buscarEmpresasParceiro(codParc: number): Promise<Array<{ codParc: number; codEmp: number; nomeEmp?: string; codTab?: number; nomeTab?: string; classificIcms?: string }>>;
  buscarListaEmpresas(): Promise<Array<{ codEmp: number; nomeEmp: string }>>;
  buscarListaTabelasPreco(): Promise<Array<{ codTab: number; nomeTab: string }>>;
  salvarEmpresaParceiro(codParc: number, codEmp: number, codTab?: number, classificIcms?: string): Promise<void>;
  removerEmpresaParceiro(codParc: number, codEmp: number): Promise<void>;
  buscarAnexosParceiro(codParc: number): Promise<ClienteAnexoDto[]>;
  salvarAnexoParceiro(
    codParc: number,
    nomeArquivo: string,
    descricao?: string,
    arquivo?: { content: Buffer; contentType: string },
  ): Promise<ClienteAnexoDto>;
  /** sequencia = SEQUENCIA da TSIATA ou NUATTACH da TSIANX; fonte indica a tabela de origem */
  baixarAnexoArquivo(codParc: number, sequencia: number, fonte: AnexoFonte, nomeArquivo?: string): Promise<AnexoArquivoDto | null>;
  removerAnexoParceiro(codParc: number, sequencia: number, fonte: AnexoFonte, descricao?: string): Promise<void>;
}