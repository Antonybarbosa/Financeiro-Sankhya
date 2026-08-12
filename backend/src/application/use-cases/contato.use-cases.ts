import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  IContatoRepository,
  AtendimentoHojeRow,
} from '../../domain/repositories/contato.repository.interface';
import { Contato, TipoContato, SituacaoContato } from '../../domain/entities/contato.entity';
import {
  CreateContatoDto,
  ContatoResponseDto,
  AtendimentoHojeItemDto,
  AtendimentoHojeResponseDto,
} from '../dto/cobranca.dto';
import {
  ITituloRepository,
  ResumoFinanceiroParceiro,
  ResumoFinanceiroAgregado,
} from '../../domain/repositories/titulo.repository.interface';
import { IAuthUser } from '../../domain/repositories/auth.repository.interface';

@Injectable()
export class ContatoUseCases {
  constructor(
    @Inject('IContatoRepository') private readonly contatoRepository: IContatoRepository,
    @Inject('ITituloRepository') private readonly tituloRepository: ITituloRepository,
  ) {}

  async criarContato(dto: CreateContatoDto): Promise<ContatoResponseDto> {
    const dataChamada = dto.dataChamada || new Date();

    const contato = Contato.create({
      id: 0,
      parceiroId: dto.parceiroId,
      parceiroNome: '',
      dataChamada,
      proximaChamada: dto.proximaChamada || null,
      tipo: dto.tipo,
      historico: dto.historico || null,
      comentarios: dto.comentarios || null,
      comentarios2: null,
      mensagem: dto.mensagem || null,
      pendente: dto.pendente ?? true,
      situacao: dto.situacao || SituacaoContato.PENDENTE,
      usuarioId: 0,
      usuarioNome: null,
      atendenteId: 0,
      atendenteNome: null,
      vendedorId: null,
      nuFin: dto.nuFin || null,
      dataAlteracao: new Date(),
    });

    const saved = await this.contatoRepository.save(contato);
    return this.mapToResponseDto(saved);
  }

  async buscarContato(id: number): Promise<ContatoResponseDto> {
    const contato = await this.contatoRepository.findById(id);
    if (!contato) {
      throw new NotFoundException(`Contato ${id} nao encontrado`);
    }
    return this.mapToResponseDto(contato);
  }

  async buscarPorParceiro(parceiroId: number): Promise<ContatoResponseDto[]> {
    const contatos = await this.contatoRepository.findByParceiro(parceiroId);
    return contatos.map(c => this.mapToResponseDto(c));
  }

  async buscarPorTipo(tipo: TipoContato): Promise<ContatoResponseDto[]> {
    const contatos = await this.contatoRepository.findByTipo(tipo);
    return contatos.map(c => this.mapToResponseDto(c));
  }

  async buscarPorSituacao(situacao: SituacaoContato): Promise<ContatoResponseDto[]> {
    const contatos = await this.contatoRepository.findBySituacao(situacao);
    return contatos.map(c => this.mapToResponseDto(c));
  }

  async buscarPendentes(): Promise<ContatoResponseDto[]> {
    const contatos = await this.contatoRepository.findPendentes();
    return contatos.map(c => this.mapToResponseDto(c));
  }

  async buscarProximasChamadas(dias: number = 7): Promise<ContatoResponseDto[]> {
    const contatos = await this.contatoRepository.findProximasChamadas(dias);
    return contatos.map(c => this.mapToResponseDto(c));
  }

  async buscarPorPeriodo(dataInicio: Date, dataFim: Date): Promise<ContatoResponseDto[]> {
    const contatos = await this.contatoRepository.findPorPeriodo(dataInicio, dataFim);
    return contatos.map(c => this.mapToResponseDto(c));
  }

  async buscarPorNuFin(nuFin: number): Promise<ContatoResponseDto[]> {
    const contatos = await this.contatoRepository.findByNuFin(nuFin);
    return contatos.map(c => this.mapToResponseDto(c));
  }

  async buscarAtendimentosHoje(usuarioLogado?: IAuthUser): Promise<AtendimentoHojeResponseDto> {
    const usuarioId = Math.floor(usuarioLogado?.codusu ?? usuarioLogado?.id ?? 0);
    const rows = await this.contatoRepository.findAtendimentosHoje(usuarioId);

    const porParceiro = new Map<number, AtendimentoHojeItemDto>();

    if (rows.length > 0) {
      const parceiroIds = [...new Set(rows.map(r => r.parceiroId))];
      const resumosFinanceiros = await this.tituloRepository.findResumoFinanceiroPorParceiros(
        parceiroIds,
      );
      const mapaFinanceiro = new Map<number, ResumoFinanceiroParceiro>(
        resumosFinanceiros.map(rf => [rf.parceiroId, rf]),
      );

      for (const row of rows) {
        const resumo = mapaFinanceiro.get(row.parceiroId);
        const item = porParceiro.get(row.parceiroId);
        if (!item) {
          porParceiro.set(row.parceiroId, {
            parceiroId: row.parceiroId,
            parceiroNome: row.parceiroNome,
            telefone: row.telefone,
            email: row.email,
            cnpjCpf: row.cnpjCpf,
            razaoSocial: row.razaoSocial,
            nomeFantasia: row.nomeFantasia,
            tipoPessoa: row.tipoPessoa,
            pessoFisJur: row.pessoFisJur,
            inscricaoEstadual: row.inscricaoEstadual,
            logradouro: row.logradouro,
            numeroEnd: row.numeroEnd,
            complemento: row.complemento,
            cep: row.cep,
            bairro: row.bairro,
            cidade: row.cidade,
            uf: row.uf,
            pendente: row.pendente,
            nurel: row.nurel,
            totalContatos: 1,
            ultimoContato: this.rowToContatoResponse(row),
            valorVencido: resumo?.valorVencido,
            diasAtrasoMax: resumo?.diasAtrasoMax,
            qtdTitulos: resumo?.qtdTitulos,
            qtdVencidos: resumo?.qtdVencidos,
          });
        } else {
          item.totalContatos += 1;
          if (row.dhchamada >= item.ultimoContato.dataChamada) {
            item.ultimoContato = this.rowToContatoResponse(row);
            item.nurel = row.nurel;
            item.pendente = row.pendente;
          }
        }
      }
    }

    const items = Array.from(porParceiro.values());
    let pendentes = 0;
    let resolvidos = 0;
    for (const it of items) {
      if (it.pendente) pendentes += 1; else resolvidos += 1;
    }

    const kpis = await this.tituloRepository.findResumoFinanceiroAgregado(
      items.map(i => i.parceiroId),
    );

    return { items, total: items.length, pendentes, resolvidos, kpis };
  }

  private rowToContatoResponse(row: AtendimentoHojeRow): ContatoResponseDto {
    return {
      id: row.nurel,
      parceiroId: row.parceiroId,
      parceiroNome: row.parceiroNome,
      dataChamada: row.dhchamada,
      proximaChamada: row.dhproxcham,
      tipo: this.mapTipoFromRow(row.tipo),
      historico: row.historico,
      comentarios: row.comentarios,
      comentarios2: null,
      mensagem: row.mensagem,
      pendente: row.pendente,
      situacao: this.mapSituacaoFromRow(row.situacao),
      usuarioId: 0,
      usuarioNome: null,
      atendenteId: 0,
      atendenteNome: null,
      vendedorId: null,
      nuFin: null,
      dataAlteracao: null,
    };
  }

  private mapTipoFromRow(tipo: string | null): TipoContato {
    if (!tipo) return TipoContato.OUTRO;
    const upper = tipo.toUpperCase();
    if (upper.includes('WA') || upper.includes('WHATS')) return TipoContato.WHATSAPP;
    if (upper.includes('TEL')) return TipoContato.TELEFONE;
    if (upper.includes('EMA') || upper.includes('MAIL')) return TipoContato.EMAIL;
    if (upper.includes('BOL')) return TipoContato.BOLETO;
    if (upper.includes('SMS')) return TipoContato.SMS;
    return TipoContato.OUTRO;
  }

  private mapSituacaoFromRow(situacao: string | null): SituacaoContato {
    const map: Record<string, SituacaoContato> = {
      P: SituacaoContato.PENDENTE,
      A: SituacaoContato.EM_ANDAMENTO,
      C: SituacaoContato.CONCLUIDO,
      X: SituacaoContato.CANCELADO,
    };
    return map[situacao || 'P'] || SituacaoContato.PENDENTE;
  }

  async atualizarSituacao(id: number, situacao: SituacaoContato): Promise<void> {
    const contato = await this.contatoRepository.findById(id);
    if (!contato) {
      throw new NotFoundException(`Contato ${id} nao encontrado`);
    }
    await this.contatoRepository.updateSituacao(id, situacao);
  }

  async marcarConcluido(id: number): Promise<void> {
    const contato = await this.contatoRepository.findById(id);
    if (!contato) {
      throw new NotFoundException(`Contato ${id} nao encontrado`);
    }
    await this.contatoRepository.marcarConcluido(id);
  }

  async marcarPendente(id: number): Promise<void> {
    const contato = await this.contatoRepository.findById(id);
    if (!contato) {
      throw new NotFoundException(`Contato ${id} nao encontrado`);
    }
    await this.contatoRepository.marcarPendente(id);
  }

  private mapToResponseDto(contato: Contato): ContatoResponseDto {
    return {
      id: contato.id,
      parceiroId: contato.parceiroId,
      parceiroNome: contato.parceiroNome,
      dataChamada: contato.dataChamada,
      proximaChamada: contato.proximaChamada,
      tipo: contato.tipo,
      historico: contato.historico,
      comentarios: contato.comentarios,
      comentarios2: contato.comentarios2,
      mensagem: contato.mensagem,
      pendente: contato.pendente,
      situacao: contato.situacao,
      usuarioId: contato.usuarioId,
      usuarioNome: contato.usuarioNome,
      atendenteId: contato.atendenteId,
      atendenteNome: contato.atendenteNome,
      vendedorId: contato.vendedorId,
      nuFin: contato.nuFin,
      dataAlteracao: contato.dataAlteracao,
    };
  }
}
