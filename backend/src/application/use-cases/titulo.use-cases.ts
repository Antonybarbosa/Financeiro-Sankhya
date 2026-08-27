import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  ITituloRepository,
  FilaCobrancaResult,
  FilaCobrancaOptions,
} from '../../domain/repositories/titulo.repository.interface';
import { Titulo, StatusTitulo } from '../../domain/entities/titulo.entity';
import {
  TituloResponseDto,
  FiltroTitulosDto,
  DashboardKpisDto,
  BoletoResponseDto,
  MetasPerformanceResponseDto,
} from '../dto/cobranca.dto';
import { ContatoUseCases } from './contato.use-cases';

@Injectable()
export class TituloUseCases {
  constructor(
    @Inject('ITituloRepository') private readonly tituloRepository: ITituloRepository,
    private readonly contatoUseCases: ContatoUseCases,
  ) {}

  async buscarTitulo(id: number): Promise<TituloResponseDto> {
    const titulo = await this.tituloRepository.findById(id);
    if (!titulo) {
      throw new NotFoundException(`Titulo ${id} nao encontrado`);
    }
    return this.mapToResponseDto(titulo);
  }

  async obterMetasPerformance(
    mesInput?: number,
    anoInput?: number,
    codemp?: number,
  ): Promise<MetasPerformanceResponseDto> {
    const now = new Date();
    const mes = mesInput && mesInput >= 1 && mesInput <= 12 ? mesInput : now.getMonth() + 1;
    const ano = anoInput && anoInput >= 2000 ? anoInput : now.getFullYear();

    const dtini = `01/${String(mes).padStart(2, '0')}/${ano}`;
    const lastDay = new Date(ano, mes, 0).getDate();
    const dtfim = `${String(lastDay).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;

    const rawRows = await this.tituloRepository.findMetasPerformance(dtini, dtfim, codemp);

    const items = rawRows.map(r => {
      const percAtingido = r.meta > 0 ? (r.recebido / r.meta) * 100 : 0;
      return {
        regra: r.regra,
        recebido: r.recebido,
        meta: r.meta,
        percCom: r.percCom,
        premio: r.premio,
        percAtingido: parseFloat(percAtingido.toFixed(2)),
      };
    });

    const totalRecebido = items.reduce((s, i) => s + i.recebido, 0);
    const totalMeta = items.reduce((s, i) => s + i.meta, 0);
    const totalPremio = items.reduce((s, i) => s + i.premio, 0);
    const percAtingidoGlobal = totalMeta > 0 ? (totalRecebido / totalMeta) * 100 : 0;

    return {
      items,
      totais: {
        totalRecebido,
        totalMeta,
        totalPremio,
        percAtingidoGlobal: parseFloat(percAtingidoGlobal.toFixed(2)),
      },
      mes,
      ano,
      codemp: codemp || null,
      dtini,
      dtfim,
    };
  }

  async buscarBoleto(id: number): Promise<BoletoResponseDto> {
    const boleto = await this.tituloRepository.findBoleto(id);
    if (!boleto) {
      throw new NotFoundException(`Titulo ${id} nao encontrado`);
    }
    return boleto;
  }

  async buscarPorCliente(clienteId: number): Promise<TituloResponseDto[]> {
    const titulos = await this.tituloRepository.findByCliente(clienteId);
    return titulos.map(t => this.mapToResponseDto(t));
  }

  async buscarVencidos(diasAtrasoMin?: number, diasAtrasoMax?: number): Promise<TituloResponseDto[]> {
    const titulos = await this.tituloRepository.findVencidos(diasAtrasoMin, diasAtrasoMax);
    return titulos.map(t => this.mapToResponseDto(t));
  }

  async buscarA_vencer(dias: number = 7): Promise<TituloResponseDto[]> {
    const titulos = await this.tituloRepository.findA_vencer(dias);
    return titulos.map(t => this.mapToResponseDto(t));
  }

  async buscarEmAberto(): Promise<TituloResponseDto[]> {
    const titulos = await this.tituloRepository.findEmAberto();
    return titulos.map(t => this.mapToResponseDto(t));
  }

  async buscarFilaCobranca(opts: FilaCobrancaOptions = {}): Promise<FilaCobrancaResult> {
    return this.tituloRepository.findFilaCobranca(opts);
  }

  async buscarComFiltros(filtros: FiltroTitulosDto): Promise<TituloResponseDto[]> {
    let titulos: Titulo[] = [];

    if (filtros.status) {
      titulos = await this.tituloRepository.findPorStatus(filtros.status);
    } else if (filtros.clienteId) {
      titulos = await this.tituloRepository.findByCliente(filtros.clienteId);
    } else if (filtros.dataInicio && filtros.dataFim) {
      titulos = await this.tituloRepository.findPorPeriodo(filtros.dataInicio, filtros.dataFim);
    } else if (filtros.diasVencimento !== undefined && filtros.diasVencimento < 0) {
      titulos = await this.tituloRepository.findVencidos(Math.abs(filtros.diasVencimento));
    } else {
      titulos = await this.tituloRepository.findEmAberto();
    }

    return titulos.map(t => this.mapToResponseDto(t));
  }

  async atualizarStatus(id: number, status: StatusTitulo): Promise<void> {
    const titulo = await this.tituloRepository.findById(id);
    if (!titulo) {
      throw new NotFoundException(`Titulo ${id} nao encontrado`);
    }
    await this.tituloRepository.updateStatus(id, status);
  }

  async obterKpis(): Promise<DashboardKpisDto> {
    const [emAberto, vencidos, a_vencer, atendimentosHoje] = await Promise.all([
      this.tituloRepository.findEmAberto(),
      this.tituloRepository.findVencidos(),
      this.tituloRepository.findA_vencer(7),
      this.contatoUseCases.buscarAtendimentosHoje(),
    ]);

    const valorEmAberto = emAberto.reduce((sum, t) => sum + t.valorEmAberto, 0);
    const valorVencido = vencidos.reduce((sum, t) => sum + t.valorEmAberto, 0);
    const valorA_vencer = a_vencer.reduce((sum, t) => sum + t.valorEmAberto, 0);

    return {
      totalTitulos: emAberto.length,
      totalVencidos: vencidos.length,
      totalA_vencer: a_vencer.length,
      totalBaixados: 0,
      valorEmAberto,
      valorVencido,
      valorA_vencer,
      valorBaixado: 0,
      cobrancasPendentes: 0,
      cobrancasEnviadas: 0,
      cobrancasFalhas: 0,
      contatosPendentes: atendimentosHoje.pendentes,
      atendidosHoje: atendimentosHoje.resolvidos,
      totalAtendimentosHoje: atendimentosHoje.total,
    };
  }

  private mapToResponseDto(titulo: Titulo): TituloResponseDto {
    return {
      id: titulo.id,
      nuNota: titulo.nuNota,
      numero: titulo.numero,
      numeroDupl: titulo.numeroDupl,
      serie: titulo.serie,
      desdobramento: titulo.desdobramento,
      clienteId: titulo.clienteId,
      clienteNome: titulo.clienteNome,
      empresa: titulo.empresa,
      valor: titulo.valor,
      valorBaixado: titulo.valorBaixado,
      valorDesconto: titulo.valorDesconto,
      valorJuros: titulo.valorJuros,
      valorMulta: titulo.valorMulta,
      valorEmAberto: titulo.valorEmAberto,
      dataVencimento: titulo.dataVencimento,
      dataEmissao: titulo.dataEmissao,
      dataBaixa: titulo.dataBaixa,
      recDesp: titulo.recDesp,
      status: titulo.status,
      historico: titulo.historico,
      nossoNumero: titulo.nossoNumero,
      codigoBarras: titulo.codigoBarras,
      linhaDigitavel: titulo.linhaDigitavel,
      nureneg: titulo.nureneg ?? null,
      hasNfe: titulo.hasNfe ?? false,
      isVencido: titulo.isVencido(),
      isEmAberto: titulo.isEmAberto(),
      diasParaVencimento: titulo.diasParaVencimento(),
      diasVencido: titulo.diasVencido(),
    };
  }
}
