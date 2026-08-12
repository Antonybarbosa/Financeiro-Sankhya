import { IsEnum, IsNumber, IsString, IsDate, IsOptional, IsArray, Min, Max, IsEmail, IsBoolean, IsInt } from 'class-validator';
import { StatusTitulo } from '../../domain/entities/titulo.entity';
import { TipoCobranca, StatusCobranca } from '../../domain/entities/cobranca.entity';
import { TipoContato, SituacaoContato } from '../../domain/entities/contato.entity';

export class CreateCobrancaDto {
  @IsNumber()
  tituloId: number;

  @IsEnum(TipoCobranca)
  tipo: TipoCobranca;

  @IsDate()
  dataAgendamento: Date;

  @IsString()
  @IsOptional()
  mensagem?: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  destinatario?: string;
}

export class UpdateCobrancaDto {
  @IsEnum(StatusCobranca)
  status: StatusCobranca;

  @IsDate()
  @IsOptional()
  dataEnvio?: Date;

  @IsString()
  @IsOptional()
  ultimoErro?: string;
}

export class CreateContatoDto {
  @IsInt()
  parceiroId: number;

  @IsEnum(TipoContato)
  tipo: TipoContato;

  @IsDate()
  @IsOptional()
  dataChamada?: Date;

  @IsDate()
  @IsOptional()
  proximaChamada?: Date;

  @IsString()
  @IsOptional()
  historico?: string;

  @IsString()
  @IsOptional()
  comentarios?: string;

  @IsString()
  @IsOptional()
  mensagem?: string;

  @IsEnum(SituacaoContato)
  @IsOptional()
  situacao?: SituacaoContato;

  @IsBoolean()
  @IsOptional()
  pendente?: boolean;

  @IsInt()
  @IsOptional()
  nuFin?: number;
}

export class TituloResponseDto {
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
  dataVencimento: Date;
  dataEmissao: Date;
  dataBaixa: Date | null;
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

export class CobrancaResponseDto {
  id: string;
  tituloId: number;
  tipo: TipoCobranca;
  status: StatusCobranca;
  dataAgendamento: Date;
  dataEnvio?: Date;
  mensagem?: string;
  destinatario?: string;
  tentativas: number;
  ultimoErro?: string;
}

export class ContatoResponseDto {
  id: number;
  parceiroId: number;
  parceiroNome: string;
  dataChamada: Date;
  proximaChamada: Date | null;
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
  dataAlteracao: Date | null;
}

export class BoletoSacadoDto {
  nome: string;
  cnpjCpf: string;
  endereco: string;
  cep: string;
  cidade: string;
  uf: string;
}

export class BoletoCedenteDto {
  nome: string;
  razaoSocial: string;
  cnpjCpf: string;
  endereco: string;
  cep: string;
  cidade: string;
  uf: string;
}

export class BoletoResponseDto {
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
  sacado: BoletoSacadoDto;
  cedente: BoletoCedenteDto;
}

export class DashboardKpisDto {
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

export class AtendimentoHojeItemDto {
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
  ultimoContato: ContatoResponseDto;
  valorVencido?: number;
  diasAtrasoMax?: number;
  qtdTitulos?: number;
  qtdVencidos?: number;
}

export class AtendimentoHojeKpisDto {
  valorEmAberto: number;
  valorVencido: number;
  valorAvencer7d: number;
  qtdTitulos: number;
  qtdVencidos: number;
  qtdAvencer7d: number;
}

export class AtendimentoHojeResponseDto {
  items: AtendimentoHojeItemDto[];
  total: number;
  pendentes: number;
  resolvidos: number;
  kpis: AtendimentoHojeKpisDto;
}

export class FiltroTitulosDto {
  @IsEnum(StatusTitulo)
  @IsOptional()
  status?: StatusTitulo;

  @IsNumber()
  @Min(1)
  @IsOptional()
  clienteId?: number;

  @IsDate()
  @IsOptional()
  dataInicio?: Date;

  @IsDate()
  @IsOptional()
  dataFim?: Date;

  @IsNumber()
  @Min(0)
  @Max(365)
  @IsOptional()
  diasVencimento?: number;

  @IsArray()
  @IsEnum(TipoCobranca, { each: true })
  @IsOptional()
  tiposCobranca?: TipoCobranca[];
}
