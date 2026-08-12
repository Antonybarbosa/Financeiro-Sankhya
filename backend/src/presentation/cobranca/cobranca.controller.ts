import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ValidationPipe,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { TituloUseCases } from '../../application/use-cases/titulo.use-cases';
import { CobrancaUseCases } from '../../application/use-cases/cobranca.use-cases';
import { ContatoUseCases } from '../../application/use-cases/contato.use-cases';
import {
  CreateCobrancaDto,
  UpdateCobrancaDto,
  CreateContatoDto,
  TituloResponseDto,
  CobrancaResponseDto,
  ContatoResponseDto,
  DashboardKpisDto,
  FiltroTitulosDto,
  BoletoResponseDto,
  AtendimentoHojeResponseDto,
} from '../../application/dto/cobranca.dto';
import { TipoContato, SituacaoContato } from '../../domain/entities/contato.entity';
import { IAuthUser } from '../../domain/repositories/auth.repository.interface';

@Controller('api/cobranca')
export class CobrancaController {
  constructor(
    private readonly tituloUseCases: TituloUseCases,
    private readonly cobrancaUseCases: CobrancaUseCases,
    private readonly contatoUseCases: ContatoUseCases,
  ) {}

  @Get('dashboard/kpis')
  async getDashboardKpis(): Promise<DashboardKpisDto> {
    return this.tituloUseCases.obterKpis();
  }

  @Get('titulos')
  async getTitulos(@Query(ValidationPipe) filtros?: FiltroTitulosDto): Promise<TituloResponseDto[]> {
    if (filtros && Object.keys(filtros).length > 0) {
      return this.tituloUseCases.buscarComFiltros(filtros);
    }
    return this.tituloUseCases.buscarEmAberto();
  }

  @Get('titulos/vencidos')
  async getTitulosVencidos(
    @Query('diasAtrasoMin') diasAtrasoMin?: string,
    @Query('diasAtrasoMax') diasAtrasoMax?: string,
  ): Promise<TituloResponseDto[]> {
    const min = diasAtrasoMin ? parseInt(diasAtrasoMin) : undefined;
    const max = diasAtrasoMax ? parseInt(diasAtrasoMax) : undefined;
    return this.tituloUseCases.buscarVencidos(min, max);
  }

  @Get('titulos/a-vencer')
  async getTitulosA_vencer(@Query('dias') dias?: string): Promise<TituloResponseDto[]> {
    const diasNumero = dias ? parseInt(dias) : 7;
    return this.tituloUseCases.buscarA_vencer(diasNumero);
  }

  @Get('titulos/em-aberto')
  async getTitulosEmAberto(): Promise<TituloResponseDto[]> {
    return this.tituloUseCases.buscarEmAberto();
  }

  @Get('fila')
  async getFilaCobranca(
    @Query('apenasVencidos') apenasVencidos?: string,
    @Query('q') busca?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tituloUseCases.buscarFilaCobranca({
      apenasVencidos: apenasVencidos === 'true',
      busca: busca || undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('titulos/:id')
  async getTitulo(@Param('id', ParseIntPipe) id: number): Promise<TituloResponseDto> {
    return this.tituloUseCases.buscarTitulo(id);
  }

  @Get('titulos/:id/boleto')
  async getBoleto(@Param('id', ParseIntPipe) id: number): Promise<BoletoResponseDto> {
    return this.tituloUseCases.buscarBoleto(id);
  }

  @Get('titulos/cliente/:clienteId')
  async getTitulosPorCliente(@Param('clienteId', ParseIntPipe) clienteId: number): Promise<TituloResponseDto[]> {
    return this.tituloUseCases.buscarPorCliente(clienteId);
  }

  @Put('titulos/:id/status')
  async updateTituloStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ): Promise<void> {
    return this.tituloUseCases.atualizarStatus(id, status as any);
  }

  @Post('cobrancas')
  async createCobranca(@Body(ValidationPipe) dto: CreateCobrancaDto): Promise<CobrancaResponseDto> {
    return this.cobrancaUseCases.criarCobranca(dto);
  }

  @Get('cobrancas')
  async getCobrancas(@Query('tipo') tipo?: string): Promise<CobrancaResponseDto[]> {
    if (tipo === 'pendentes') {
      return this.cobrancaUseCases.buscarPendentesEnvio();
    }
    if (tipo === 'falhas') {
      return this.cobrancaUseCases.buscarFalhasRetentaveis();
    }
    return [];
  }

  @Get('cobrancas/:id')
  async getCobranca(@Param('id') id: string): Promise<CobrancaResponseDto> {
    return this.cobrancaUseCases.buscarCobranca(id);
  }

  @Get('titulos/:tituloId/cobrancas')
  async getCobrancasPorTitulo(@Param('tituloId', ParseIntPipe) tituloId: number): Promise<CobrancaResponseDto[]> {
    return this.cobrancaUseCases.buscarPorTitulo(tituloId);
  }

  @Put('cobrancas/:id')
  async updateCobranca(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateCobrancaDto,
  ): Promise<CobrancaResponseDto> {
    return this.cobrancaUseCases.atualizarCobranca(id, dto);
  }

  @Put('cobrancas/:id/entregue')
  async marcarComoEntregue(@Param('id') id: string): Promise<CobrancaResponseDto> {
    return this.cobrancaUseCases.marcarEntregue(id);
  }

  @Post('contatos')
  async createContato(@Body(ValidationPipe) dto: CreateContatoDto): Promise<ContatoResponseDto> {
    return this.contatoUseCases.criarContato(dto);
  }

  @Get('contatos')
  async getContatos(
    @Query('tipo') tipo?: string,
    @Query('situacao') situacao?: string,
    @Query('pendentes') pendentes?: string,
    @Query('proximas') proximas?: string,
  ): Promise<ContatoResponseDto[]> {
    if (pendentes === 'true') {
      return this.contatoUseCases.buscarPendentes();
    }
    if (proximas) {
      return this.contatoUseCases.buscarProximasChamadas(parseInt(proximas) || 7);
    }
    if (tipo) {
      return this.contatoUseCases.buscarPorTipo(tipo as TipoContato);
    }
    if (situacao) {
      return this.contatoUseCases.buscarPorSituacao(situacao as SituacaoContato);
    }
    return [];
  }

  @Get('contatos/:id')
  async getContato(@Param('id', ParseIntPipe) id: number): Promise<ContatoResponseDto> {
    return this.contatoUseCases.buscarContato(id);
  }

  @Get('contatos/parceiro/:parceiroId')
  async getContatosPorParceiro(@Param('parceiroId', ParseIntPipe) parceiroId: number): Promise<ContatoResponseDto[]> {
    return this.contatoUseCases.buscarPorParceiro(parceiroId);
  }

  @Get('titulos/:nuFin/contatos')
  async getContatosPorTitulo(@Param('nuFin', ParseIntPipe) nuFin: number): Promise<ContatoResponseDto[]> {
    return this.contatoUseCases.buscarPorNuFin(nuFin);
  }

  @Put('contatos/:id/situacao')
  async updateContatoSituacao(
    @Param('id', ParseIntPipe) id: number,
    @Body('situacao') situacao: string,
  ): Promise<void> {
    return this.contatoUseCases.atualizarSituacao(id, situacao as SituacaoContato);
  }

  @Put('contatos/:id/concluir')
  async concluirContato(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.contatoUseCases.marcarConcluido(id);
  }

  @Put('contatos/:id/pendente')
  async marcarContatoPendente(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.contatoUseCases.marcarPendente(id);
  }

  @Get('atendimento/hoje')
  async getAtendimentosHoje(@Req() req: { user: IAuthUser }): Promise<AtendimentoHojeResponseDto> {
    return this.contatoUseCases.buscarAtendimentosHoje(req.user);
  }
}
