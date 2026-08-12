import { Injectable } from '@nestjs/common';
import { ICobrancaRepository } from '../../domain/repositories/cobranca.repository.interface';
import { Cobranca, TipoCobranca, StatusCobranca } from '../../domain/entities/cobranca.entity';

interface CobrancaData {
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

@Injectable()
export class InMemoryCobrancaRepository implements ICobrancaRepository {
  private cobrancas: Map<string, CobrancaData> = new Map();

  async findById(id: string): Promise<Cobranca | null> {
    const data = this.cobrancas.get(id);
    return data ? this.mapToCobranca(data) : null;
  }

  async findByTitulo(tituloId: number): Promise<Cobranca[]> {
    const cobrancas = Array.from(this.cobrancas.values())
      .filter(c => c.tituloId === tituloId);
    return cobrancas.map(c => this.mapToCobranca(c));
  }

  async findByTipo(tipo: TipoCobranca): Promise<Cobranca[]> {
    const cobrancas = Array.from(this.cobrancas.values())
      .filter(c => c.tipo === tipo);
    return cobrancas.map(c => this.mapToCobranca(c));
  }

  async findByStatus(status: StatusCobranca): Promise<Cobranca[]> {
    const cobrancas = Array.from(this.cobrancas.values())
      .filter(c => c.status === status);
    return cobrancas.map(c => this.mapToCobranca(c));
  }

  async findPendentesEnvio(): Promise<Cobranca[]> {
    const cobrancas = Array.from(this.cobrancas.values())
      .filter(c => c.status === StatusCobranca.PENDENTE && c.dataAgendamento <= new Date());
    return cobrancas.map(c => this.mapToCobranca(c));
  }

  async findFalhasRetentaveis(): Promise<Cobranca[]> {
    const cobrancas = Array.from(this.cobrancas.values())
      .filter(c => c.status === StatusCobranca.FALHOU && c.tentativas < 3);
    return cobrancas.map(c => this.mapToCobranca(c));
  }

  async save(cobranca: Cobranca): Promise<Cobranca> {
    const data: CobrancaData = {
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

    this.cobrancas.set(cobranca.id, data);
    return cobranca;
  }

  async updateStatus(id: string, status: StatusCobranca): Promise<void> {
    const existing = this.cobrancas.get(id);
    if (existing) {
      existing.status = status;
      this.cobrancas.set(id, existing);
    }
  }

  async countPorTitulo(tituloId: number): Promise<number> {
    return Array.from(this.cobrancas.values())
      .filter(c => c.tituloId === tituloId)
      .length;
  }

  private mapToCobranca(data: CobrancaData): Cobranca {
    return Cobranca.create({
      id: data.id,
      tituloId: data.tituloId,
      tipo: data.tipo,
      status: data.status,
      dataAgendamento: data.dataAgendamento,
      dataEnvio: data.dataEnvio,
      mensagem: data.mensagem,
      destinatario: data.destinatario,
      tentativas: data.tentativas,
      ultimoErro: data.ultimoErro,
    });
  }
}