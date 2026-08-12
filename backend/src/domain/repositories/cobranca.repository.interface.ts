import { Cobranca, TipoCobranca, StatusCobranca } from '../entities/cobranca.entity';

export interface ICobrancaRepository {
  findById(id: string): Promise<Cobranca | null>;
  findByTitulo(tituloId: number): Promise<Cobranca[]>;
  findByTipo(tipo: TipoCobranca): Promise<Cobranca[]>;
  findByStatus(status: StatusCobranca): Promise<Cobranca[]>;
  findPendentesEnvio(): Promise<Cobranca[]>;
  findFalhasRetentaveis(): Promise<Cobranca[]>;
  save(cobranca: Cobranca): Promise<Cobranca>;
  updateStatus(id: string, status: StatusCobranca): Promise<void>;
  countPorTitulo(tituloId: number): Promise<number>;
}