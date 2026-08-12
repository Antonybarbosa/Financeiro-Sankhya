export interface NfeItem {
  numero: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  desconto?: number;
}

export interface NfeDados {
  nunota: number;
  numnota: number;
  chave: string;
  modelo: string;
  status: string;
  dataEmissao: string | null;
  dataSaida: string | null;
  numero: string;
  serie: string;
  naturezaOperacao: string;
  emitente: {
    cnpj: string;
    razaoSocial: string;
    ie: string;
    endereco: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    fone: string;
  };
  destinatario: {
    cnpjCpf: string;
    razaoSocial: string;
    ie: string;
    endereco: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    fone: string;
    email: string;
  };
  itens: NfeItem[];
  totais: {
    baseCalculoIcms: number;
    valorIcms: number;
    baseCalculoIcmsSt: number;
    valorIcmsSt: number;
    valorProdutos: number;
    valorFrete: number;
    valorSeguro: number;
    valorDesconto: number;
    valorIpi: number;
    valorPis: number;
    valorCofins: number;
    valorTotal: number;
  };
  transporte: {
    modalidadeFrete: string;
    transportadora: string;
  };
  pagamento: {
    forma: string;
    valor: number;
  };
  qrCode: string | null;
  xmlUrl: string;
}
