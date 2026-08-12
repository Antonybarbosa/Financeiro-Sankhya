export enum StatusCobranca {
  PENDENTE = 'PENDENTE',
  ENVIADA = 'ENVIADA',
  ENTREGUE = 'ENTREGUE',
  FALHOU = 'FALHOU',
  CANCELADA = 'CANCELADA',
}

export enum TipoCobranca {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  BOLETO = 'BOLETO',
}

export class Cobranca {
  constructor(
    public readonly id: string,
    public readonly tituloId: number,
    public readonly tipo: TipoCobranca,
    public readonly status: StatusCobranca,
    public readonly dataAgendamento: Date,
    public readonly dataEnvio?: Date,
    public readonly mensagem?: string,
    public readonly destinatario?: string,
    public readonly tentativas: number = 0,
    public readonly ultimoErro?: string,
  ) {}

  podeRetentar(maxTentativas: number = 3): boolean {
    return (
      (this.status === StatusCobranca.FALHOU || this.status === StatusCobranca.PENDENTE) &&
      this.tentativas < maxTentativas
    );
  }

  marcarEnviada(dataEnvio: Date): Cobranca {
    return new Cobranca(
      this.id,
      this.tituloId,
      this.tipo,
      StatusCobranca.ENVIADA,
      this.dataAgendamento,
      dataEnvio,
      this.mensagem,
      this.destinatario,
      this.tentativas + 1,
      undefined,
    );
  }

  marcarFalha(erro: string, dataEnvio: Date): Cobranca {
    return new Cobranca(
      this.id,
      this.tituloId,
      this.tipo,
      StatusCobranca.FALHOU,
      this.dataAgendamento,
      dataEnvio,
      this.mensagem,
      this.destinatario,
      this.tentativas + 1,
      erro,
    );
  }

  static create(props: Omit<Cobranca, 'podeRetentar' | 'marcarEnviada' | 'marcarFalha'>): Cobranca {
    return new Cobranca(
      props.id,
      props.tituloId,
      props.tipo,
      props.status,
      props.dataAgendamento,
      props.dataEnvio,
      props.mensagem,
      props.destinatario,
      props.tentativas,
      props.ultimoErro,
    );
  }
}