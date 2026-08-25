export interface RenegociacaoParams {
  nufins: number[];
  nroparcel: number;
  freq: string;
  venc: string;
  txjur: number;
  txmul: number;
  negoc: string;
  codTipTit: number;
  codConta: number;
  empresaNovosTitulos: number;
  comEntrada?: boolean;
  jur?: number;
  mul?: number;
  novaDataVencimento?: string;
}

export interface ParcelaSimulada {
  DESDOBRAMENTO?: string;
  DTVENC?: string;
  DTNEG?: string;
  DHMOV?: string;
  VLRDESDOB?: string;
  VLRJURO?: string;
  VLRMULTA?: string;
  VLRDESC?: string;
  CODPARC?: string;
  CODEMP?: string;
  CODTIPTIT?: string;
  TIPJURO?: string;
  TIPMULTA?: string;
  [key: string]: unknown;
}

export interface SimulacaoResultado {
  parcelas: ParcelaSimulada[];
  originais: Record<string, unknown>;
}

export interface TitOrig {
  NUFIN: number;
  VLRJURO: number;
  VLRMULTA: number;
}

export interface RenegPrefs {
  calcDesc?: string;
  manNossoNro?: string;
  renegConDif?: string;
  atuMetas?: string;
}

export interface ConfirmarPayload {
  nufins: number[];
  parcelas: Record<string, unknown>[];
  titOrigs: TitOrig[];
  prefs?: RenegPrefs;
}

export interface ParcelaGerada {
  nuFin: number;
  desdobramento: string;
  dataVencimento: string;
  valor: number;
}

export interface ConfirmacaoResultado {
  nureneg: number;
  nufins: number[];
  parcelasGeradas: ParcelaGerada[];
}

export interface OpcaoFrequencia {
  value: string;
  label: string;
}

export const FREQUENCIA_OPCOES: OpcaoFrequencia[] = [
  { value: '1', label: 'Semanal' },
  { value: '2', label: 'Quinzenal' },
  { value: '3', label: 'Mensal' },
  { value: '4', label: 'Bimestral' },
  { value: '5', label: 'Trimestral' },
  { value: '6', label: 'Quadrimestral' },
  { value: '7', label: 'Semestral' },
  { value: '8', label: 'Anual' },
];

export const VENCIMENTO_OPCOES = [
  { value: '1', label: 'Manter vencimento original' },
  { value: '2', label: 'A partir de hoje' },
  { value: '3', label: 'Data fixa' },
];

export const NEGOCIACAO_OPCOES = [
  { value: '1', label: 'Renegociar mantendo' },
  { value: '2', label: 'Consolidar títulos' },
];

export const TIPO_TITULO_OPCOES = [
  { value: 2, label: '2 - Boleto' },
  { value: 1, label: '1 - Dinheiro' },
  { value: 3, label: '3 - Cheque' },
  { value: 4, label: '4 - Cartão de Crédito/Débito' },
  { value: 5, label: '5 - Depósito / Transferência' },
];

export const CONTA_OPCOES = [
  { value: 97, label: '97 - Banco Bradesco' },
  { value: 1, label: '1 - Caixa Geral' },
  { value: 10, label: '10 - Banco do Brasil' },
  { value: 20, label: '20 - Itaú Unibanco' },
  { value: 30, label: '30 - Santander' },
];

export const EMPRESA_OPCOES = [
  { value: 2, label: '2 - Empresa Principal (Cód 2)' },
  { value: 1, label: '1 - Matriz (Cód 1)' },
];

export const DEFAULT_RENEGOCIACAO_PARAMS: Omit<RenegociacaoParams, 'nufins'> = {
  nroparcel: 3,
  freq: '3',
  venc: '2',
  txjur: 1,
  txmul: 1,
  negoc: '2',
  codTipTit: 2,
  codConta: 97,
  empresaNovosTitulos: 2,
  comEntrada: false,
  jur: 0,
  mul: 0,
};

export const DEFAULT_PREFS: RenegPrefs = {
  calcDesc: '0',
  manNossoNro: 'N',
  renegConDif: 'N',
  atuMetas: 'N',
};
