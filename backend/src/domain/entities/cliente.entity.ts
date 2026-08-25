export enum TipoPessoa {
  FISICA = 'F',
  JURIDICA = 'J',
}

/**
 * Classificação de crédito do parceiro (TGFPAR.SITUACAO).
 * Constraint CKC_SITUACAO_TGFPAR: NULL ou IN ('P','R','B','O','E').
 * NÃO é ativo/inativo — o status de atividade é a coluna ATIVO ('S'/'N').
 */
export enum SituacaoCliente {
  PESSIMO = 'P',
  REGULAR = 'R',
  BOM = 'B',
  OTIMO = 'O',
  EXCELENTE = 'E',
}

export class Cliente {
  constructor(
    public readonly codParc: number,
    public readonly nomeParc: string,
    public readonly razaoSocial: string | null,
    public readonly cnpjCpf: string | null,
    public readonly tipoPessoa: TipoPessoa,
    public readonly situacao: SituacaoCliente,
    public readonly ativo: boolean,
    public readonly telefone: string | null,
    public readonly email: string | null,
    public readonly inscricaoEstadual: string | null,
    public readonly prazoPag: number | null,
    public readonly limiteCredito: number | null,
    public readonly endereco: {
      codEnd: number;
      codBai: number;
      codCid: number;
      logradouro: string | null;
      numero: string | null;
      complemento: string | null;
      bairro: string | null;
      cidade: string | null;
      uf: string | null;
      cep: string | null;
    },
    public readonly dataCadastro: Date | null,
    public readonly dataUltimaAlteracao: Date | null,
    public readonly observacoes?: string | null,
    public readonly limiteCreditoMensal?: number | null,
    public readonly qtdMaxTitVencidos?: number | null,
    public readonly codTab?: string | null,
    public readonly codVend?: number | null,
    public readonly codBco?: number | null,
    public readonly descBonif?: string | null,
    public readonly descFin?: number | null,
    public readonly inscricaoMunicipal?: string | null,
    public readonly classificacaoIcms?: string | null,
    public readonly retemIss?: string | null,
    public readonly retemInss?: string | null,
    public readonly retemPis?: string | null,
    public readonly retemCofins?: string | null,
    public readonly retemCsl?: string | null,
    public readonly adCredCli?: number | null,
    public readonly adLimitePar?: number | null,
    public readonly adLocalCad?: string | null,
    public readonly adEndCompleto?: string | null,
    public readonly adCodBcoBol?: number | null,
    public readonly adDtUltCompra?: Date | null,
    public readonly simples?: string | null,
    public readonly perfilEconect?: string | null,
    public readonly tipoFatur?: string | null,
    public readonly regimeEspTribIss?: string | null,
    public readonly tipoClienteServCom?: string | null,
    public readonly emailNotifEntrega?: string | null,
    public readonly entregaEndContato?: string | null,
    public readonly exigContatoEntCab?: string | null,
    public readonly latitude?: string | null,
    public readonly longitude?: string | null,
    public readonly latitudeEntrega?: string | null,
    public readonly longitudeEntrega?: string | null,
    public readonly enderecoEntrega?: {
      codEnd?: number | null;
      codBai?: number | null;
      codCid?: number | null;
      logradouro?: string | null;
      numero?: string | null;
      complemento?: string | null;
      bairro?: string | null;
      cidade?: string | null;
      uf?: string | null;
      cep?: string | null;
      nomeContato?: string | null;
    } | null,
    public readonly nomeBco?: string | null,
    public readonly adNomeBcoBol?: string | null,
    public readonly nomeVend?: string | null,
    public readonly codTipParc?: number | null,
    public readonly codReg?: number | null,
    public readonly grupoAutor?: number | null,
    public readonly bloquear?: string | null,
    public readonly motBloq?: string | null,
    public readonly tipAnexoNfe?: string | null,
    public readonly emailDanfe?: string | null,
    public readonly emailNfe?: string | null,
    public readonly adDtAprovRep?: Date | null,
    public readonly nomeTipParc?: string | null,
    public readonly nomeReg?: string | null,
  ) {}

  isAtivo(): boolean {
    return this.ativo;
  }

  isPessoaFisica(): boolean {
    return this.tipoPessoa === TipoPessoa.FISICA;
  }

  isPessoaJuridica(): boolean {
    return this.tipoPessoa === TipoPessoa.JURIDICA;
  }

  getEnderecoCompleto(): string {
    const partes = [
      this.endereco.logradouro,
      this.endereco.numero,
      this.endereco.complemento,
      this.endereco.bairro,
      this.endereco.cidade,
      this.endereco.uf,
    ].filter(Boolean);
    
    return partes.join(', ');
  }

  static create(props: Omit<Cliente, 'isAtivo' | 'isPessoaFisica' | 'isPessoaJuridica' | 'getEnderecoCompleto'>): Cliente {
    return new Cliente(
      props.codParc,
      props.nomeParc,
      props.razaoSocial,
      props.cnpjCpf,
      props.tipoPessoa,
      props.situacao,
      props.ativo,
      props.telefone,
      props.email,
      props.inscricaoEstadual,
      props.prazoPag,
      props.limiteCredito,
      props.endereco,
      props.dataCadastro,
      props.dataUltimaAlteracao,
      props.observacoes,
      props.limiteCreditoMensal,
      props.qtdMaxTitVencidos,
      props.codTab,
      props.codVend,
      props.codBco,
      props.descBonif,
      props.descFin,
      props.inscricaoMunicipal,
      props.classificacaoIcms,
      props.retemIss,
      props.retemInss,
      props.retemPis,
      props.retemCofins,
      props.retemCsl,
      props.adCredCli,
      props.adLimitePar,
      props.adLocalCad,
      props.adEndCompleto,
      props.adCodBcoBol,
      props.adDtUltCompra,
      props.simples,
      props.perfilEconect,
      props.tipoFatur,
      props.regimeEspTribIss,
      props.tipoClienteServCom,
      props.emailNotifEntrega,
      props.entregaEndContato,
      props.exigContatoEntCab,
      props.latitude,
      props.longitude,
      props.latitudeEntrega,
      props.longitudeEntrega,
      props.enderecoEntrega,
      props.nomeBco,
      props.adNomeBcoBol,
      props.nomeVend,
      props.codTipParc,
      props.codReg,
      props.grupoAutor,
      props.bloquear,
      props.motBloq,
      props.tipAnexoNfe,
      props.emailDanfe,
      props.emailNfe,
      props.adDtAprovRep,
      props.nomeTipParc,
      props.nomeReg,
    );
  }
}