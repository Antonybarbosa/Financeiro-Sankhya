import { Contato, TipoContato, SituacaoContato } from '../entities/contato.entity';

export interface AtendimentoHojeRow {
  nurel: number;
  parceiroId: number;
  parceiroNome: string;
  telefone: string | null;
  email: string | null;
  cnpjCpf: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  tipoPessoa: string | null;
  pessoFisJur: string | null;
  inscricaoEstadual: string | null;
  logradouro: string | null;
  numeroEnd: string | null;
  complemento: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  pendente: boolean;
  dhchamada: Date;
  dhproxcham: Date | null;
  tipo: string | null;
  historico: string | null;
  comentarios: string | null;
  mensagem: string | null;
  situacao: string | null;
}

export interface IContatoRepository {
  findById(id: number): Promise<Contato | null>;
  findByParceiro(parceiroId: number): Promise<Contato[]>;
  findByTipo(tipo: TipoContato): Promise<Contato[]>;
  findBySituacao(situacao: SituacaoContato): Promise<Contato[]>;
  findPendentes(codUsuarioLogado?: number): Promise<Contato[]>;
  findProximasChamadas(dias: number, codUsuarioLogado?: number): Promise<Contato[]>;
  findPorPeriodo(dataInicio: Date, dataFim: Date): Promise<Contato[]>;
  findByNuFin(nuFin: number): Promise<Contato[]>;
  findAtendimentosHoje(codUsuarioLogado: number): Promise<AtendimentoHojeRow[]>;
  save(contato: Contato): Promise<Contato>;
  updateSituacao(id: number, situacao: SituacaoContato): Promise<void>;
  marcarConcluido(id: number): Promise<void>;
  marcarPendente(id: number): Promise<void>;
}
