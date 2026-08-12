export enum TipoContato {
  TELEFONE = 'TELEFONE',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  BOLETO = 'BOLETO',
  SMS = 'SMS',
  OUTRO = 'OUTRO',
}

export enum SituacaoContato {
  PENDENTE = 'PENDENTE',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO',
}

export class Contato {
  constructor(
    public readonly id: number,
    public readonly parceiroId: number,
    public readonly parceiroNome: string,
    public readonly dataChamada: Date,
    public readonly proximaChamada: Date | null,
    public readonly tipo: TipoContato,
    public readonly historico: string | null,
    public readonly comentarios: string | null,
    public readonly comentarios2: string | null,
    public readonly mensagem: string | null,
    public readonly pendente: boolean,
    public readonly situacao: SituacaoContato,
    public readonly usuarioId: number,
    public readonly usuarioNome: string | null,
    public readonly atendenteId: number,
    public readonly atendenteNome: string | null,
    public readonly vendedorId: number | null,
    public readonly nuFin: number | null,
    public readonly dataAlteracao: Date | null,
  ) {}

  isPendente(): boolean {
    return this.pendente;
  }

  temProximaChamada(): boolean {
    return this.proximaChamada !== null;
  }

  static create(props: Omit<Contato, 'isPendente' | 'temProximaChamada'>): Contato {
    return new Contato(
      props.id,
      props.parceiroId,
      props.parceiroNome,
      props.dataChamada,
      props.proximaChamada,
      props.tipo,
      props.historico,
      props.comentarios,
      props.comentarios2,
      props.mensagem,
      props.pendente,
      props.situacao,
      props.usuarioId,
      props.usuarioNome,
      props.atendenteId,
      props.atendenteNome,
      props.vendedorId,
      props.nuFin,
      props.dataAlteracao,
    );
  }
}
