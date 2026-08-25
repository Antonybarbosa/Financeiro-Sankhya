export type TipoPessoa = 'F' | 'J';
/** Classificação de crédito (TGFPAR.SITUACAO) — NÃO é ativo/inativo */
export type SituacaoCliente = 'P' | 'R' | 'B' | 'O' | 'E';

export const SITUACAO_LABELS: Record<SituacaoCliente, string> = {
  E: 'Excelente',
  O: 'Ótima',
  B: 'Boa',
  R: 'Regular',
  P: 'Péssima',
};

export interface EnderecoCliente {
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
}

export interface Cliente {
  codParc: number;
  nomeParc: string;
  razaoSocial?: string;
  cnpjCpf?: string;
  tipoPessoa: TipoPessoa;
  situacao: SituacaoCliente | null;
  ativo: boolean;
  telefone?: string;
  email?: string;
  inscricaoEstadual?: string;
  prazoPag?: number | null;
  limiteCredito?: number | null;
  observacoes?: string | null;
  limiteCreditoMensal?: number | null;
  qtdMaxTitVencidos?: number | null;
  codTab?: string | null;
  codVend?: number | null;
  codBco?: number | null;
  descBonif?: string | null;
  descFin?: number | null;
  inscricaoMunicipal?: string | null;
  classificacaoIcms?: string | null;
  retemIss?: string | null;
  retemInss?: string | null;
  retemPis?: string | null;
  retemCofins?: string | null;
  retemCsl?: string | null;
  adCredCli?: number | null;
  adLimitePar?: number | null;
  adLocalCad?: string | null;
  adEndCompleto?: string | null;
  adCodBcoBol?: number | null;
  adDtUltCompra?: string | null;
  simples?: string | null;
  perfilEconect?: string | null;
  tipoFatur?: string | null;
  regimeEspTribIss?: string | null;
  tipoClienteServCom?: string | null;
  emailNotifEntrega?: string | null;
  entregaEndContato?: string | null;
  exigContatoEntCab?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  latitudeEntrega?: string | null;
  longitudeEntrega?: string | null;
  codTipParc?: number | null;
  codReg?: number | null;
  dtCad?: string | null;
  dtAlter?: string | null;
  grupoAutor?: number | null;
  bloquear?: string | null;
  motBloq?: string | null;
  tipAnexoNfe?: string | null;
  emailDanfe?: string | null;
  emailNfe?: string | null;
  adDtAprovRep?: string | null;
  nomeTipParc?: string | null;
  nomeReg?: string | null;
  enderecoEntrega?: EnderecoCliente & { nomeContato?: string | null };
  nomeBco?: string | null;
  adNomeBcoBol?: string | null;
  nomeVend?: string | null;
  endereco?: EnderecoCliente;
  dataCadastro?: string;
  dataUltimaAlteracao?: string | null;
}

export interface ClienteFiltros {
  nome?: string;
  cnpjCpf?: string;
  situacao?: SituacaoCliente;
  ativo?: 'S' | 'N';
}

export interface CreateClientePayload {
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
  enderecoEntrega?: EnderecoCliente & { nomeContato?: string };
  endereco?: EnderecoCliente;
}

export interface UpdateClientePayload extends Partial<CreateClientePayload> {
  situacao?: SituacaoCliente;
}

export interface ClienteListResponse {
  clientes: Cliente[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface EmpresaParceiro {
  codParc: number;
  codEmp: number;
  nomeEmp?: string;
  codTab?: number;
  nomeTab?: string;
  classificIcms?: string;
}

export interface TabelaPreco {
  codTab: number;
  nomeTab: string;
}

export type AnexoFonte = 'TSIATA' | 'TSIANX';

export interface ClienteAnexo {
  nuAttach: number;
  fonte: AnexoFonte;
  nomeArquivo: string;
  descricao?: string;
  dataCadastro?: string;
  tipoAcesso?: string;
  tipoApres?: string;
  chaveArquivo?: string;
  tamanhoBytes?: number;
}
