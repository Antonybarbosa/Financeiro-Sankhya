import { IsArray, IsNumber, IsOptional, IsString, IsBoolean, Min, ArrayMinSize } from 'class-validator';

export class ParcelamentoParams {
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  nufins: number[];

  @IsNumber()
  @Min(1)
  nroparcel: number;

  @IsString()
  freq: string;

  @IsString()
  venc: string;

  @IsNumber()
  txjur: number;

  @IsNumber()
  txmul: number;

  @IsString()
  negoc: string;

  @IsNumber()
  codTipTit: number;

  @IsNumber()
  codConta: number;

  @IsNumber()
  empresaNovosTitulos: number;

  @IsBoolean()
  @IsOptional()
  comEntrada?: boolean;

  @IsNumber()
  @IsOptional()
  jur?: number;

  @IsNumber()
  @IsOptional()
  mul?: number;

  @IsString()
  @IsOptional()
  novaDataVencimento?: string;
}

export class TitOrigDto {
  @IsNumber()
  NUFIN: number;

  @IsNumber()
  VLRJURO: number;

  @IsNumber()
  VLRMULTA: number;
}

export class RenegPrefsDto {
  @IsString()
  @IsOptional()
  calcDesc?: string;

  @IsString()
  @IsOptional()
  manNossoNro?: string;

  @IsString()
  @IsOptional()
  renegConDif?: string;

  @IsString()
  @IsOptional()
  atuMetas?: string;
}

export class ConfirmarRenegociacaoDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  nufins: number[];

  @IsArray()
  @ArrayMinSize(1)
  parcelas: Record<string, any>[];

  @IsArray()
  @ArrayMinSize(1)
  titOrigs: TitOrigDto[];

  @IsOptional()
  prefs?: RenegPrefsDto;
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
  [key: string]: any;
}

export interface SimulacaoResultado {
  parcelas: ParcelaSimulada[];
  originais: Record<string, any>;
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
  raw?: any;
}
