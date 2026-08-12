export enum StatusTitulo {
  PENDENTE = 'PENDENTE',
  VENCIDO = 'VENCIDO',
  PAGO = 'PAGO',
  BAIXADO = 'BAIXADO',
  BAIXA_PARCIAL = 'BAIXA_PARCIAL',
  CANCELADO = 'CANCELADO',
  NEGOCIADO = 'NEGOCIADO',
}

export class Titulo {
  constructor(
    public readonly id: number,
    public readonly nuNota: number | null,
    public readonly numero: string,
    public readonly numeroDupl: number | null,
    public readonly serie: string,
    public readonly desdobramento: string,
    public readonly clienteId: number,
    public readonly clienteNome: string,
    public readonly empresa: number,
    public readonly valor: number,
    public readonly valorBaixado: number,
    public readonly valorDesconto: number,
    public readonly valorJuros: number,
    public readonly valorMulta: number,
    public readonly valorEmAberto: number,
    public readonly dataVencimento: Date,
    public readonly dataEmissao: Date,
    public readonly dataBaixa: Date | null,
    public readonly recDesp: number,
    public readonly status: StatusTitulo,
    public readonly historico?: string,
    public readonly nossoNumero?: string,
    public readonly codigoBarras?: string,
    public readonly linhaDigitavel?: string,
    public readonly nureneg?: number | null,
    public readonly hasNfe?: boolean,
  ) {}

  isEmAberto(): boolean {
    return (
      this.status === StatusTitulo.PENDENTE ||
      this.status === StatusTitulo.VENCIDO ||
      this.status === StatusTitulo.BAIXA_PARCIAL
    );
  }

  isVencido(): boolean {
    return this.status === StatusTitulo.VENCIDO;
  }

  isPago(): boolean {
    return (
      this.status === StatusTitulo.PAGO ||
      this.status === StatusTitulo.BAIXADO
    );
  }

  isReceber(): boolean {
    return this.recDesp === 1;
  }

  isPagar(): boolean {
    return this.recDesp === -1;
  }

  diasParaVencimento(): number {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(this.dataVencimento);
    vencimento.setHours(0, 0, 0, 0);
    const diffTime = vencimento.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  diasVencido(): number {
    if (!this.isVencido()) return 0;
    return Math.abs(this.diasParaVencimento());
  }

  static create(props: Omit<Titulo, 'isEmAberto' | 'isVencido' | 'isPago' | 'isReceber' | 'isPagar' | 'diasParaVencimento' | 'diasVencido'>): Titulo {
    return new Titulo(
      props.id,
      props.nuNota,
      props.numero,
      props.numeroDupl,
      props.serie,
      props.desdobramento,
      props.clienteId,
      props.clienteNome,
      props.empresa,
      props.valor,
      props.valorBaixado,
      props.valorDesconto,
      props.valorJuros,
      props.valorMulta,
      props.valorEmAberto,
      props.dataVencimento,
      props.dataEmissao,
      props.dataBaixa,
      props.recDesp,
      props.status,
      props.historico,
      props.nossoNumero,
      props.codigoBarras,
      props.linhaDigitavel,
      props.nureneg,
      props.hasNfe ?? false,
    );
  }
}
