import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ICobrancaRepository } from '../../domain/repositories/cobranca.repository.interface';
import { Cobranca, TipoCobranca, StatusCobranca } from '../../domain/entities/cobranca.entity';
import { CreateCobrancaDto, UpdateCobrancaDto, CobrancaResponseDto } from '../dto/cobranca.dto';

@Injectable()
export class CobrancaUseCases {
  constructor(@Inject('ICobrancaRepository') private readonly cobrancaRepository: ICobrancaRepository) {}

  async criarCobranca(dto: CreateCobrancaDto): Promise<CobrancaResponseDto> {
    const id = this.generateId();
    const cobranca = Cobranca.create({
      id,
      tituloId: dto.tituloId,
      tipo: dto.tipo,
      status: StatusCobranca.PENDENTE,
      dataAgendamento: dto.dataAgendamento,
      mensagem: dto.mensagem,
      destinatario: dto.destinatario,
      tentativas: 0,
    });

    const saved = await this.cobrancaRepository.save(cobranca);
    return this.mapToResponseDto(saved);
  }

  async buscarCobranca(id: string): Promise<CobrancaResponseDto> {
    const cobranca = await this.cobrancaRepository.findById(id);
    if (!cobranca) {
      throw new NotFoundException(`Cobrança com ID ${id} não encontrada`);
    }
    return this.mapToResponseDto(cobranca);
  }

  async buscarPorTitulo(tituloId: number): Promise<CobrancaResponseDto[]> {
    const cobrancas = await this.cobrancaRepository.findByTitulo(tituloId);
    return cobrancas.map(c => this.mapToResponseDto(c));
  }

  async buscarPendentesEnvio(): Promise<CobrancaResponseDto[]> {
    const cobrancas = await this.cobrancaRepository.findPendentesEnvio();
    return cobrancas.map(c => this.mapToResponseDto(c));
  }

  async buscarFalhasRetentaveis(): Promise<CobrancaResponseDto[]> {
    const cobrancas = await this.cobrancaRepository.findFalhasRetentaveis();
    return cobrancas.map(c => this.mapToResponseDto(c));
  }

  async atualizarCobranca(id: string, dto: UpdateCobrancaDto): Promise<CobrancaResponseDto> {
    const existing = await this.cobrancaRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Cobrança com ID ${id} não encontrada`);
    }

    await this.cobrancaRepository.updateStatus(id, dto.status);

    const updated = await this.cobrancaRepository.findById(id);
    if (!updated) {
      throw new NotFoundException(`Cobrança com ID ${id} não encontrada após atualização`);
    }

    return this.mapToResponseDto(updated);
  }

  async processarEnvio(cobranca: Cobranca, sucesso: boolean, erro?: string): Promise<CobrancaResponseDto> {
    const dataEnvio = new Date();
    
    let atualizada: Cobranca;
    if (sucesso) {
      atualizada = cobranca.marcarEnviada(dataEnvio);
    } else {
      atualizada = cobranca.marcarFalha(erro || 'Erro desconhecido', dataEnvio);
    }

    const saved = await this.cobrancaRepository.save(atualizada);
    return this.mapToResponseDto(saved);
  }

  async marcarEntregue(id: string): Promise<CobrancaResponseDto> {
    const existing = await this.cobrancaRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Cobrança com ID ${id} não encontrada`);
    }

    await this.cobrancaRepository.updateStatus(id, StatusCobranca.ENTREGUE);

    const updated = await this.cobrancaRepository.findById(id);
    if (!updated) {
      throw new NotFoundException(`Cobrança com ID ${id} não encontrada após atualização`);
    }

    return this.mapToResponseDto(updated);
  }

  private generateId(): string {
    return `cob-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapToResponseDto(cobranca: Cobranca): CobrancaResponseDto {
    return {
      id: cobranca.id,
      tituloId: cobranca.tituloId,
      tipo: cobranca.tipo,
      status: cobranca.status,
      dataAgendamento: cobranca.dataAgendamento,
      dataEnvio: cobranca.dataEnvio,
      mensagem: cobranca.mensagem,
      destinatario: cobranca.destinatario,
      tentativas: cobranca.tentativas,
      ultimoErro: cobranca.ultimoErro,
    };
  }
}