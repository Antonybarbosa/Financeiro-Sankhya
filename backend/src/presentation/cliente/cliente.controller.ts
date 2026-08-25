import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ValidationPipe,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
  UploadedFile,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import { ClienteUseCases } from '../../application/use-cases/cliente.use-cases';
import {
  CreateClienteDto,
  UpdateClienteDto,
  ClienteResponseDto,
  ClienteListResponseDto,
} from '../../application/dto/cliente.dto';
import { SituacaoCliente } from '../../domain/entities/cliente.entity';

@Controller('api/clientes')
export class ClienteController {
  constructor(private readonly clienteUseCases: ClienteUseCases) {}

  @Get()
  async listarClientes(
    @Query('nome') nome?: string,
    @Query('cnpjCpf') cnpjCpf?: string,
    @Query('situacao') situacao?: SituacaoCliente,
    @Query('ativo') ativo?: 'S' | 'N',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ClienteListResponseDto> {
    const filtros: any = {};

    if (nome) filtros.nome = nome;
    if (cnpjCpf) filtros.cnpjCpf = cnpjCpf;
    if (situacao) filtros.situacao = situacao;
    if (ativo === 'S' || ativo === 'N') filtros.ativo = ativo;

    const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 100);

    const resultado = await this.clienteUseCases.buscarTodos(filtros, pageNum, limitNum);

    return {
      clientes: resultado.clientes.map(c => this.mapToResponseDto(c)),
      total: resultado.total,
      page: resultado.page,
      limit: resultado.limit,
      totalPages: resultado.totalPages,
    };
  }

  @Get('enderecos/cidades')
  async buscarCidades(@Query('query') query = '') {
    return await this.clienteUseCases.buscarCidades(query);
  }

  @Get('enderecos/bairros')
  async buscarBairros(@Query('query') query = '') {
    return await this.clienteUseCases.buscarBairros(query);
  }

  @Get('enderecos/logradouros')
  async buscarLogradouros(@Query('query') query = '') {
    return await this.clienteUseCases.buscarLogradouros(query);
  }

  @Get('enderecos/cep/:cep')
  async buscarCep(@Param('cep') cep: string) {
    return await this.clienteUseCases.buscarCep(cep);
  }

  @Get('bancos')
  async buscarBancos(@Query('query') query = '') {
    return await this.clienteUseCases.buscarBancos(query);
  }

  @Get('tipos-parceiro')
  async buscarTiposParceiro(@Query('query') query = '') {
    return await this.clienteUseCases.buscarTiposParceiro(query);
  }

  @Get('regioes')
  async buscarRegioes(@Query('query') query = '') {
    return await this.clienteUseCases.buscarRegioes(query);
  }

  @Get('empresas/disponiveis')
  async buscarListaEmpresas() {
    return await this.clienteUseCases.buscarListaEmpresas();
  }

  @Get('tabelas-preco/disponiveis')
  async buscarListaTabelasPreco() {
    return await this.clienteUseCases.buscarListaTabelasPreco();
  }

  @Get(':codParc/empresas')
  async buscarEmpresasParceiro(@Param('codParc', ParseIntPipe) codParc: number) {
    return await this.clienteUseCases.buscarEmpresasParceiro(codParc);
  }

  @Post(':codParc/empresas')
  async salvarEmpresaParceiro(
    @Param('codParc', ParseIntPipe) codParc: number,
    @Body() body: { codEmp: number; codTab?: number; classificIcms?: string },
  ) {
    await this.clienteUseCases.salvarEmpresaParceiro(
      codParc,
      body.codEmp,
      body.codTab,
      body.classificIcms,
    );
    return { success: true, mensagem: 'Empresa do parceiro salva com sucesso' };
  }

  @Delete(':codParc/empresas/:codEmp')
  async removerEmpresaParceiro(
    @Param('codParc', ParseIntPipe) codParc: number,
    @Param('codEmp', ParseIntPipe) codEmp: number,
  ) {
    await this.clienteUseCases.removerEmpresaParceiro(codParc, codEmp);
    return { success: true, mensagem: 'Empresa do parceiro removida com sucesso' };
  }

  @Get('count')
  async contarClientes(): Promise<{ total: number }> {
    const total = await this.clienteUseCases.contarClientes();
    return { total };
  }

  @Get('validar-documento/:cnpjCpf')
  async validarDocumento(
    @Param('cnpjCpf') cnpjCpf: string,
    @Query('codParc') codParc?: string,
  ): Promise<{ existe: boolean; mensagem?: string }> {
    const codParcNum = codParc ? parseInt(codParc, 10) : undefined;
    return await this.clienteUseCases.validarDocumento(cnpjCpf, codParcNum);
  }

  @Get('buscar/cnpj/:cnpjCpf')
  async buscarPorCnpjCpf(@Param('cnpjCpf') cnpjCpf: string): Promise<ClienteResponseDto[]> {
    const clientes = await this.clienteUseCases.buscarPorCnpjCpf(cnpjCpf);
    return clientes.map(c => this.mapToResponseDto(c));
  }

  @Get(':codParc')
  async buscarPorId(@Param('codParc', ParseIntPipe) codParc: number): Promise<ClienteResponseDto> {
    const cliente = await this.clienteUseCases.buscarPorId(codParc);
    
    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado');
    }
    
    return this.mapToResponseDto(cliente);
  }

  @Post()
  async criarCliente(@Body(ValidationPipe) dto: CreateClienteDto): Promise<ClienteResponseDto> {
    const cliente = await this.clienteUseCases.criarCliente(dto);
    return this.mapToResponseDto(cliente);
  }

  @Put(':codParc')
  async atualizarCliente(
    @Param('codParc', ParseIntPipe) codParc: number,
    @Body(ValidationPipe) dto: UpdateClienteDto,
  ): Promise<ClienteResponseDto> {
    const cliente = await this.clienteUseCases.atualizarCliente(codParc, dto);
    return this.mapToResponseDto(cliente);
  }

  @Delete(':codParc')
  async deletarCliente(@Param('codParc', ParseIntPipe) codParc: number): Promise<{ mensagem: string }> {
    await this.clienteUseCases.deletarCliente(codParc);
    return { mensagem: 'Cliente inativado com sucesso (ATIVO=N)' };
  }

  @Get(':codParc/anexos')
  async buscarAnexosParceiro(@Param('codParc', ParseIntPipe) codParc: number) {
    return await this.clienteUseCases.buscarAnexosCliente(codParc);
  }

  @Post(':codParc/anexos')
  async salvarAnexoParceiro(
    @Param('codParc', ParseIntPipe) codParc: number,
    @Body() body: { nomeArquivo: string; descricao?: string },
  ) {
    return await this.clienteUseCases.criarAnexoCliente(codParc, body.nomeArquivo, body.descricao);
  }

  @Post(':codParc/anexos/upload')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadAnexoParceiro(
    @Param('codParc', ParseIntPipe) codParc: number,
    @UploadedFile() arquivo: Express.Multer.File,
    @Body('descricao') descricao?: string,
  ) {
    if (!arquivo || !arquivo.buffer || arquivo.buffer.length === 0) {
      throw new BadRequestException('Arquivo é obrigatório (campo "arquivo" do multipart/form-data)');
    }

    return await this.clienteUseCases.criarAnexoCliente(codParc, arquivo.originalname, descricao, {
      content: arquivo.buffer,
      contentType: arquivo.mimetype,
    });
  }

  @Get(':codParc/anexos/:sequencia/arquivo')
  async baixarAnexoArquivo(
    @Param('codParc', ParseIntPipe) codParc: number,
    @Param('sequencia', ParseIntPipe) sequencia: number,
    @Query('fonte') fonte: string = 'TSIATA',
    @Query('nomeArquivo') nomeArquivo: string = '',
    @Res() res: any,
  ) {
    const anexo = await this.clienteUseCases.baixarAnexoCliente(codParc, sequencia, fonte, nomeArquivo);

    res.set({
      'Content-Type': anexo.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(anexo.nomeArquivo)}"`,
    });
    return res.send(anexo.buffer);
  }

  @Delete(':codParc/anexos/:sequencia')
  async removerAnexoParceiro(
    @Param('codParc', ParseIntPipe) codParc: number,
    @Param('sequencia', ParseIntPipe) sequencia: number,
    @Query('fonte') fonte: string = 'TSIATA',
    @Query('descricao') descricao: string = '',
  ) {
    await this.clienteUseCases.removerAnexoCliente(codParc, sequencia, fonte, descricao);
    return { mensagem: 'Anexo removido com sucesso' };
  }

  private mapToResponseDto(cliente: any): ClienteResponseDto {
    return {
      codParc: cliente.codParc,
      nomeParc: cliente.nomeParc,
      razaoSocial: cliente.razaoSocial,
      cnpjCpf: cliente.cnpjCpf,
      tipoPessoa: cliente.tipoPessoa,
      situacao: cliente.situacao ?? null,
      ativo: cliente.ativo,
      telefone: cliente.telefone,
      email: cliente.email,
      inscricaoEstadual: cliente.inscricaoEstadual,
      prazoPag: cliente.prazoPag ?? null,
      limiteCredito: cliente.limiteCredito ?? null,
      observacoes: cliente.observacoes ?? null,
      limiteCreditoMensal: cliente.limiteCreditoMensal ?? null,
      qtdMaxTitVencidos: cliente.qtdMaxTitVencidos ?? null,
      codTab: cliente.codTab ?? null,
      codVend: cliente.codVend ?? null,
      codBco: cliente.codBco ?? null,
      descBonif: cliente.descBonif ?? null,
      descFin: cliente.descFin ?? null,
      inscricaoMunicipal: cliente.inscricaoMunicipal ?? null,
      classificacaoIcms: cliente.classificacaoIcms ?? null,
      retemIss: cliente.retemIss ?? null,
      retemInss: cliente.retemInss ?? null,
      retemPis: cliente.retemPis ?? null,
      retemCofins: cliente.retemCofins ?? null,
      retemCsl: cliente.retemCsl ?? null,
      adCredCli: cliente.adCredCli ?? null,
      adLimitePar: cliente.adLimitePar ?? null,
      adLocalCad: cliente.adLocalCad ?? null,
      adEndCompleto: cliente.adEndCompleto ?? null,
      adCodBcoBol: cliente.adCodBcoBol ?? null,
      adDtUltCompra: cliente.adDtUltCompra ?? null,
      simples: cliente.simples ?? null,
      perfilEconect: cliente.perfilEconect ?? null,
      tipoFatur: cliente.tipoFatur ?? null,
      regimeEspTribIss: cliente.regimeEspTribIss ?? null,
      tipoClienteServCom: cliente.tipoClienteServCom ?? null,
      emailNotifEntrega: cliente.emailNotifEntrega ?? null,
      entregaEndContato: cliente.entregaEndContato ?? null,
      exigContatoEntCab: cliente.exigContatoEntCab ?? null,
      latitude: cliente.latitude ?? null,
      longitude: cliente.longitude ?? null,
      latitudeEntrega: cliente.latitudeEntrega ?? null,
      longitudeEntrega: cliente.longitudeEntrega ?? null,
      enderecoEntrega: cliente.enderecoEntrega ?? null,
      nomeBco: cliente.nomeBco ?? null,
      adNomeBcoBol: cliente.adNomeBcoBol ?? null,
      nomeVend: cliente.nomeVend ?? null,
      codTipParc: cliente.codTipParc ?? null,
      codReg: cliente.codReg ?? null,
      grupoAutor: cliente.grupoAutor ?? null,
      bloquear: cliente.bloquear ?? null,
      motBloq: cliente.motBloq ?? null,
      tipAnexoNfe: cliente.tipAnexoNfe ?? null,
      emailDanfe: cliente.emailDanfe ?? null,
      emailNfe: cliente.emailNfe ?? null,
      adDtAprovRep: cliente.adDtAprovRep ?? null,
      nomeTipParc: cliente.nomeTipParc ?? null,
      nomeReg: cliente.nomeReg ?? null,
      endereco: cliente.endereco,
      dataCadastro: cliente.dataCadastro,
      dataUltimaAlteracao: cliente.dataUltimaAlteracao,
    };
  }
}