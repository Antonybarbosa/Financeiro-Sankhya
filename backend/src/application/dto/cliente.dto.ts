import { IsString, IsEnum, IsOptional, IsEmail, IsObject, IsNumber, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPessoa, SituacaoCliente } from '../../domain/entities/cliente.entity';

export class EnderecoDto {
  @IsNumber()
  @IsOptional()
  codEnd?: number;

  @IsNumber()
  @IsOptional()
  codBai?: number;

  @IsNumber()
  @IsOptional()
  codCid?: number;

  @IsString()
  @IsOptional()
  logradouro?: string;

  @IsString()
  @IsOptional()
  numero?: string;

  @IsString()
  @IsOptional()
  complemento?: string;

  @IsString()
  @IsOptional()
  bairro?: string;

  @IsString()
  @IsOptional()
  cidade?: string;

  @IsString()
  @IsOptional()
  uf?: string;

  @IsString()
  @IsOptional()
  cep?: string;
}

export class EnderecoEntregaDto {
  @IsNumber()
  @IsOptional()
  codEnd?: number;

  @IsNumber()
  @IsOptional()
  codBai?: number;

  @IsNumber()
  @IsOptional()
  codCid?: number;

  @IsString()
  @IsOptional()
  logradouro?: string;

  @IsString()
  @IsOptional()
  numero?: string;

  @IsString()
  @IsOptional()
  complemento?: string;

  @IsString()
  @IsOptional()
  bairro?: string;

  @IsString()
  @IsOptional()
  cidade?: string;

  @IsString()
  @IsOptional()
  uf?: string;

  @IsString()
  @IsOptional()
  cep?: string;

  @IsString()
  @IsOptional()
  nomeContato?: string;
}

export class CreateClienteDto {
  @IsString()
  nomeParc!: string;

  @IsString()
  @IsOptional()
  razaoSocial?: string;

  @IsString()
  @IsOptional()
  cnpjCpf?: string;

  @IsEnum(TipoPessoa)
  tipoPessoa!: TipoPessoa;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  inscricaoEstadual?: string;

  @IsNumber()
  @IsOptional()
  prazoPag?: number;

  @IsNumber()
  @IsOptional()
  limiteCredito?: number;

  @IsString()
  @IsOptional()
  observacoes?: string;

  @IsNumber()
  @IsOptional()
  limiteCreditoMensal?: number;

  @IsNumber()
  @IsOptional()
  qtdMaxTitVencidos?: number;

  @IsString()
  @IsOptional()
  codTab?: string;

  @IsNumber()
  @IsOptional()
  codVend?: number;

  @IsNumber()
  @IsOptional()
  codBco?: number;

  @IsIn(['J', 'S', 'P', 'L'])
  @IsOptional()
  descBonif?: string;

  @IsNumber()
  @IsOptional()
  descFin?: number;

  @IsString()
  @IsOptional()
  inscricaoMunicipal?: string;

  @IsString()
  @IsOptional()
  classificacaoIcms?: string;

  @IsString()
  @IsOptional()
  retemIss?: string;

  @IsString()
  @IsOptional()
  retemInss?: string;

  @IsString()
  @IsOptional()
  retemPis?: string;

  @IsString()
  @IsOptional()
  retemCofins?: string;

  @IsString()
  @IsOptional()
  retemCsl?: string;

  @IsNumber()
  @IsOptional()
  adCredCli?: number;

  @IsNumber()
  @IsOptional()
  adLimitePar?: number;

  @IsString()
  @IsOptional()
  adLocalCad?: string;

  @IsString()
  @IsOptional()
  adEndCompleto?: string;

  @IsNumber()
  @IsOptional()
  adCodBcoBol?: number;

  @IsString()
  @IsOptional()
  adDtUltCompra?: string;

  @IsString()
  @IsOptional()
  simples?: string;

  @IsString()
  @IsOptional()
  perfilEconect?: string;

  @IsString()
  @IsOptional()
  tipoFatur?: string;

  @IsString()
  @IsOptional()
  regimeEspTribIss?: string;

  @IsString()
  @IsOptional()
  tipoClienteServCom?: string;

  @IsString()
  @IsOptional()
  emailNotifEntrega?: string;

  @IsString()
  @IsOptional()
  entregaEndContato?: string;

  @IsString()
  @IsOptional()
  exigContatoEntCab?: string;

  @IsString()
  @IsOptional()
  latitude?: string;

  @IsString()
  @IsOptional()
  longitude?: string;

  @IsString()
  @IsOptional()
  latitudeEntrega?: string;

  @IsString()
  @IsOptional()
  longitudeEntrega?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EnderecoEntregaDto)
  @IsOptional()
  enderecoEntrega?: EnderecoEntregaDto;

  @IsObject()
  @ValidateNested()
  @Type(() => EnderecoDto)
  @IsOptional()
  endereco?: EnderecoDto;
}

export class UpdateClienteDto {
  @IsString()
  @IsOptional()
  nomeParc?: string;

  @IsString()
  @IsOptional()
  razaoSocial?: string;

  @IsString()
  @IsOptional()
  cnpjCpf?: string;

  @IsEnum(TipoPessoa)
  @IsOptional()
  tipoPessoa?: TipoPessoa;

  @IsEnum(SituacaoCliente)
  @IsOptional()
  situacao?: SituacaoCliente;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  inscricaoEstadual?: string;

  @IsNumber()
  @IsOptional()
  prazoPag?: number;

  @IsNumber()
  @IsOptional()
  limiteCredito?: number;

  @IsString()
  @IsOptional()
  observacoes?: string;

  @IsNumber()
  @IsOptional()
  limiteCreditoMensal?: number;

  @IsNumber()
  @IsOptional()
  qtdMaxTitVencidos?: number;

  @IsString()
  @IsOptional()
  codTab?: string;

  @IsNumber()
  @IsOptional()
  codVend?: number;

  @IsNumber()
  @IsOptional()
  codBco?: number;

  @IsIn(['J', 'S', 'P', 'L'])
  @IsOptional()
  descBonif?: string;

  @IsNumber()
  @IsOptional()
  descFin?: number;

  @IsString()
  @IsOptional()
  inscricaoMunicipal?: string;

  @IsString()
  @IsOptional()
  classificacaoIcms?: string;

  @IsString()
  @IsOptional()
  retemIss?: string;

  @IsString()
  @IsOptional()
  retemInss?: string;

  @IsString()
  @IsOptional()
  retemPis?: string;

  @IsString()
  @IsOptional()
  retemCofins?: string;

  @IsString()
  @IsOptional()
  retemCsl?: string;

  @IsNumber()
  @IsOptional()
  adCredCli?: number;

  @IsNumber()
  @IsOptional()
  adLimitePar?: number;

  @IsString()
  @IsOptional()
  adLocalCad?: string;

  @IsString()
  @IsOptional()
  adEndCompleto?: string;

  @IsNumber()
  @IsOptional()
  adCodBcoBol?: number;

  @IsString()
  @IsOptional()
  adDtUltCompra?: string;

  @IsString()
  @IsOptional()
  simples?: string;

  @IsString()
  @IsOptional()
  perfilEconect?: string;

  @IsString()
  @IsOptional()
  tipoFatur?: string;

  @IsString()
  @IsOptional()
  regimeEspTribIss?: string;

  @IsString()
  @IsOptional()
  tipoClienteServCom?: string;

  @IsString()
  @IsOptional()
  emailNotifEntrega?: string;

  @IsString()
  @IsOptional()
  entregaEndContato?: string;

  @IsString()
  @IsOptional()
  exigContatoEntCab?: string;

  @IsString()
  @IsOptional()
  latitude?: string;

  @IsString()
  @IsOptional()
  longitude?: string;

  @IsString()
  @IsOptional()
  latitudeEntrega?: string;

  @IsString()
  @IsOptional()
  longitudeEntrega?: string;

  @IsString()
  @IsOptional()
  ativo?: string;

  @IsNumber()
  @IsOptional()
  codTipParc?: number;

  @IsNumber()
  @IsOptional()
  codReg?: number;

  @IsString()
  @IsOptional()
  dtCad?: string;

  @IsString()
  @IsOptional()
  dtAlter?: string;

  @IsNumber()
  @IsOptional()
  grupoAutor?: number;

  @IsString()
  @IsOptional()
  bloquear?: string;

  @IsString()
  @IsOptional()
  motBloq?: string;

  @IsString()
  @IsOptional()
  tipAnexoNfe?: string;

  @IsString()
  @IsOptional()
  emailDanfe?: string;

  @IsString()
  @IsOptional()
  emailNfe?: string;

  @IsString()
  @IsOptional()
  adDtAprovRep?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EnderecoEntregaDto)
  @IsOptional()
  enderecoEntrega?: EnderecoEntregaDto;

  @IsObject()
  @ValidateNested()
  @Type(() => EnderecoDto)
  @IsOptional()
  endereco?: EnderecoDto;
}

export class ClienteResponseDto {
  codParc: number;
  nomeParc: string;
  razaoSocial: string | null;
  cnpjCpf: string | null;
  tipoPessoa: TipoPessoa;
  situacao: SituacaoCliente | null;
  ativo: boolean;
  telefone: string | null;
  email: string | null;
  inscricaoEstadual: string | null;
  prazoPag: number | null;
  limiteCredito: number | null;
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
  adDtUltCompra?: Date | null;
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
  grupoAutor?: number | null;
  bloquear?: string | null;
  motBloq?: string | null;
  tipAnexoNfe?: string | null;
  emailDanfe?: string | null;
  emailNfe?: string | null;
  adDtAprovRep?: Date | null;
  nomeTipParc?: string | null;
  nomeReg?: string | null;
  enderecoEntrega?: {
    codEnd?: number | null;
    codBai?: number | null;
    codCid?: number | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
    cep?: string | null;
    nomeContato?: string | null;
  } | null;
  nomeBco?: string | null;
  adNomeBcoBol?: string | null;
  nomeVend?: string | null;
  endereco: {
    codEnd: number;
    codBai: number;
    codCid: number;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
  };
  dataCadastro: Date;
  dataUltimaAlteracao: Date | null;
}

export class ClienteListResponseDto {
  clientes: ClienteResponseDto[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}