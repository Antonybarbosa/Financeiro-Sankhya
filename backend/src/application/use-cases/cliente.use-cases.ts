import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Cliente, SituacaoCliente, TipoPessoa } from '../../domain/entities/cliente.entity';
import {
  IClienteRepository,
  CreateClienteDto as CreateClienteDtoApp,
  UpdateClienteDto as UpdateClienteDtoApp,
  FindAllClientesResult,
} from '../../domain/repositories/cliente.repository.interface';
import { CreateClienteDto as CreateClienteDtoHttp, UpdateClienteDto as UpdateClienteDtoHttp } from '../dto/cliente.dto';

@Injectable()
export class ClienteUseCases {
  constructor(@Inject('IClienteRepository') private readonly clienteRepository: IClienteRepository) {}

  async buscarTodos(
    filtros?: { nome?: string; cnpjCpf?: string; situacao?: SituacaoCliente; ativo?: 'S' | 'N' },
    page = 1,
    limit = 50,
  ): Promise<FindAllClientesResult> {
    return await this.clienteRepository.findAll(filtros, page, limit);
  }

  async buscarCidades(query: string) {
    return await this.clienteRepository.buscarCidades(query);
  }

  async buscarBairros(query: string) {
    return await this.clienteRepository.buscarBairros(query);
  }

  async buscarLogradouros(query: string) {
    return await this.clienteRepository.buscarLogradouros(query);
  }

  async buscarBancos(query: string) {
    return await this.clienteRepository.buscarBancos(query);
  }

  async buscarTiposParceiro(query: string) {
    return await this.clienteRepository.buscarTiposParceiro(query);
  }

  async buscarRegioes(query: string) {
    return await this.clienteRepository.buscarRegioes(query);
  }

  async buscarCep(cep: string) {
    return await this.clienteRepository.buscarCep(cep);
  }

  async buscarEmpresasParceiro(codParc: number) {
    return await this.clienteRepository.buscarEmpresasParceiro(codParc);
  }

  async buscarListaEmpresas() {
    return await this.clienteRepository.buscarListaEmpresas();
  }

  async buscarListaTabelasPreco() {
    return await this.clienteRepository.buscarListaTabelasPreco();
  }

  async salvarEmpresaParceiro(
    codParc: number,
    codEmp: number,
    codTab?: number,
    classificIcms?: string,
  ) {
    return await this.clienteRepository.salvarEmpresaParceiro(
      codParc,
      codEmp,
      codTab,
      classificIcms,
    );
  }

  async removerEmpresaParceiro(codParc: number, codEmp: number) {
    return await this.clienteRepository.removerEmpresaParceiro(codParc, codEmp);
  }

  async buscarPorId(codParc: number): Promise<Cliente | null> {
    return await this.clienteRepository.findById(codParc);
  }

  async buscarPorCnpjCpf(cnpjCpf: string): Promise<Cliente[]> {
    const cpfLimpo = cnpjCpf.replace(/\D/g, '');
    return await this.clienteRepository.findByCnpjCpf(cpfLimpo);
  }

  async criarCliente(dados: CreateClienteDtoHttp): Promise<Cliente> {
    if (!dados.nomeParc || dados.nomeParc.trim() === '') {
      throw new BadRequestException('Nome do cliente é obrigatório');
    }

    const cnpjLimpo = (dados.cnpjCpf || '').replace(/\D/g, '');

    if (!cnpjLimpo) {
      throw new BadRequestException(
        dados.tipoPessoa === TipoPessoa.JURIDICA
          ? 'CNPJ é obrigatório para pessoa jurídica'
          : 'CPF é obrigatório para pessoa física',
      );
    }

    this.validarTamanhoCnpjCpf(cnpjLimpo, dados.tipoPessoa);

    if (!dados.endereco?.codCid && !dados.endereco?.cidade?.trim()) {
      throw new BadRequestException('Cidade é obrigatória para cadastrar cliente');
    }

    const duplicados = await this.clienteRepository.findByCnpjCpf(cnpjLimpo, true);
    if (duplicados.length > 0) {
      throw new ConflictException(
        `Já existe cliente cadastrado com este ${dados.tipoPessoa === TipoPessoa.JURIDICA ? 'CNPJ' : 'CPF'}`,
      );
    }

    try {
      return await this.clienteRepository.create(dados);
    } catch (error) {
      console.error('[ClienteUseCases] Erro ao criar cliente:', (error as any)?.message);
      throw error;
    }
  }

  async atualizarCliente(codParc: number, dados: UpdateClienteDtoHttp): Promise<Cliente> {
    const existente = await this.clienteRepository.findById(codParc);
    if (!existente) {
      throw new NotFoundException('Cliente não encontrado');
    }

    if (dados.cnpjCpf !== undefined) {
      const cnpjLimpo = dados.cnpjCpf.replace(/\D/g, '');

      if (cnpjLimpo.length > 0) {
        const tipo = dados.tipoPessoa ?? existente.tipoPessoa;
        this.validarTamanhoCnpjCpf(cnpjLimpo, tipo);

        const cnpjAtual = (existente.cnpjCpf || '').replace(/\D/g, '');
        if (cnpjLimpo !== cnpjAtual) {
          const duplicados = await this.clienteRepository.findByCnpjCpf(cnpjLimpo, true);
          if (duplicados.some(c => c.codParc !== codParc)) {
            throw new ConflictException('Já existe outro cliente cadastrado com este CNPJ/CPF');
          }
        }
      }
    }

    return await this.clienteRepository.update(codParc, dados);
  }

  async deletarCliente(codParc: number): Promise<void> {
    const existente = await this.clienteRepository.findById(codParc);
    if (!existente) {
      throw new NotFoundException('Cliente não encontrado');
    }

    await this.clienteRepository.delete(codParc);
  }

  async contarClientes(): Promise<number> {
    return await this.clienteRepository.count();
  }

  async validarDocumento(cnpjCpf: string, codParc?: number): Promise<{ existe: boolean; mensagem?: string }> {
    return await this.clienteRepository.validarDocumentoExistente(cnpjCpf, codParc);
  }

  async buscarAnexosCliente(codParc: number) {
    return await this.clienteRepository.buscarAnexosParceiro(codParc);
  }

  async criarAnexoCliente(
    codParc: number,
    nomeArquivo: string,
    descricao?: string,
    arquivo?: { content: Buffer; contentType: string },
  ) {
    if (!nomeArquivo || !nomeArquivo.trim()) {
      throw new BadRequestException('Nome do arquivo é obrigatório');
    }
    return await this.clienteRepository.salvarAnexoParceiro(codParc, nomeArquivo.trim(), descricao, arquivo);
  }

  async baixarAnexoCliente(codParc: number, sequencia: number, fonte: string, nomeArquivo?: string) {
    const resultado = await this.clienteRepository.baixarAnexoArquivo(codParc, sequencia, fonte as any, nomeArquivo);
    if (!resultado) {
      throw new NotFoundException(
        'Arquivo do anexo não disponível. Para arquivos TSIANX sem cache, o arquivo físico pode não estar acessível neste ambiente.',
      );
    }
    return resultado;
  }

  async removerAnexoCliente(codParc: number, sequencia: number, fonte: string, descricao?: string) {
    await this.clienteRepository.removerAnexoParceiro(codParc, sequencia, fonte as any, descricao);
  }

  private validarTamanhoCnpjCpf(digitos: string, tipoPessoa: TipoPessoa): void {
    if (tipoPessoa === TipoPessoa.JURIDICA && digitos.length !== 14) {
      throw new BadRequestException('CNPJ deve conter 14 dígitos');
    }

    if (tipoPessoa === TipoPessoa.FISICA && digitos.length !== 11) {
      throw new BadRequestException('CPF deve conter 11 dígitos');
    }
  }
}
