import { Injectable, BadGatewayException } from '@nestjs/common';
import { SankhyaGateway } from '../sankhya/sankhya.gateway';
import { chunkedIn } from '../sankhya/sql-utils';
import {
  ParcelamentoParams,
  ConfirmarRenegociacaoDto,
  SimulacaoResultado,
  ConfirmacaoResultado,
  ParcelaGerada,
} from '../../application/dto/renegociacao.dto';

const CLIENT_EVENTS = [{ $: 'Renegociacao.usouJurosMultaParceiro' }];

@Injectable()
export class SankhyaRenegociacaoRepository {
  constructor(private readonly sankhyaGateway: SankhyaGateway) {}

  async simular(params: ParcelamentoParams): Promise<SimulacaoResultado> {
    const data = await this.parcelar(params, false);
    return this.parseSimulacao(data);
  }

  async confirmar(dto: ConfirmarRenegociacaoDto): Promise<ConfirmacaoResultado> {
    const prefs = {
      calcDesc: dto.prefs?.calcDesc ?? '0',
      manNossoNro: dto.prefs?.manNossoNro ?? 'N',
      renegConDif: dto.prefs?.renegConDif ?? 'N',
      atuMetas: dto.prefs?.atuMetas ?? 'N',
    };

    const template = await this.buscarTemplateTitulos(dto.nufins);
    const parcelsEnriquecidas = dto.parcelas.map((p) => this.enriquecerParcela(p, template));

    const requestBody = {
      serviceName: 'RenegociacaoSP.renegociar',
      requestBody: {
        reneg: {
          nureneg: '',
          prefs,
          titOrigs: {
            titOrig: dto.titOrigs,
          },
          parcels: {
            record: parcelsEnriquecidas,
          },
        },
        clientEventList: { clientEvent: CLIENT_EVENTS },
      },
    };

    const data = await this.sankhyaGateway.serviceCall(
      'RenegociacaoSP.renegociar',
      requestBody,
      'mgefin',
    );

    const resultado = this.parseConfirmacao(data);
    resultado.parcelasGeradas = await this.buscarParcelasGeradas(resultado.nureneg);
    resultado.nufins = resultado.parcelasGeradas.map((p) => p.nuFin);

    return resultado;
  }

  private async buscarTemplateTitulos(nufins: number[]): Promise<Record<string, any>> {
    if (!nufins.length) return {};
    const inClause = chunkedIn('FIN.NUFIN', nufins);
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT FIN.NUFIN, FIN.NUMNOTA, FIN.SERIENOTA, FIN.CODPARC, PAR.CGC_CPF,
             FIN.CODEMP, FIN.RECDESP, FIN.PROVISAO, FIN.CODTIPOPER, FIN.CODTIPTIT,
             FIN.CODNAT, FIN.CODCENCUS, FIN.CODPROJ, FIN.NUMCONTRATO, FIN.ORIGEM,
             FIN.CODVEND, FIN.CODBCO, FIN.CODCTABCOINT, FIN.CODMOEDA, FIN.NUNOTA,
             TO_CHAR(FIN.DHTIPOPER, 'DD/MM/YYYY HH24:MI:SS') AS DHTIPOPER,
             TO_CHAR(FIN.DTENTSAI, 'DD/MM/YYYY HH24:MI:SS') AS DTENTSAI,
             FIN.SEQUENCIA, FIN.HISTORICO
      FROM TGFFIN FIN
      INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
      WHERE ${inClause}
        AND ROWNUM <= 1
    `);
    return rows.length > 0 ? rows[0] : {};
  }

  private enriquecerParcela(parcela: Record<string, any>, template: Record<string, any>): Record<string, any> {
    const enriquecida = { ...parcela };

    const defaults: Record<string, any> = {
      NUMNOTA: template.NUMNOTA,
      SERIENOTA: template.SERIENOTA,
      CODPARC: template.CODPARC,
      CGC_CPF_PARC: template.CGC_CPF,
      CODEMP: template.CODEMP,
      RECDESP: template.RECDESP || '1',
      PROVISAO: template.PROVISAO || 'N',
      CODTIPOPER: template.CODTIPOPER,
      CODTIPTIT: template.CODTIPTIT,
      CODNAT: template.CODNAT,
      CODCENCUS: template.CODCENCUS,
      CODPROJ: template.CODPROJ || '0',
      NUMCONTRATO: template.NUMCONTRATO || '0',
      ORIGEM: template.ORIGEM || 'E',
      CODVEND: template.CODVEND,
      CODBCO: template.CODBCO || '999',
      CODCTABCOINT: template.CODCTABCOINT,
      CODMOEDA: template.CODMOEDA || '0',
      NUNOTA: template.NUNOTA,
      DHTIPOPER: template.DHTIPOPER,
      DTENTSAI: template.DTENTSAI,
      SEQUENCIA: template.SEQUENCIA || '1',
      HISTORICO: template.HISTORICO || '',
      CONTABILIZADO: 'N',
      CONCILIADO: 'N',
      ANTECIPADO: 'N',
      BLOQVAR: 'N',
      RATEADO: 'N',
      RATEADOCAB: 'N',
      INSSRETIDO: 'N',
      IRFRETIDO: 'N',
      ISSRETIDO: 'N',
      TIMBLOQUEADA: 'N',
      AUTORIZADO: 'N',
    };

    for (const [key, value] of Object.entries(defaults)) {
      if (value !== undefined && value !== null && (enriquecida[key] === undefined || enriquecida[key] === '')) {
        enriquecida[key] = String(value);
      }
    }

    const vlrDesdob = parseFloat(enriquecida.VLRDESDOB) || 0;
    const vlrJuro = parseFloat(enriquecida.VLRJURO) || 0;
    const vlrMulta = parseFloat(enriquecida.VLRMULTA) || 0;
    enriquecida.VLRLIQUIDO = String((vlrDesdob + vlrJuro + vlrMulta).toFixed(2));

    return enriquecida;
  }

  private async parcelar(params: ParcelamentoParams, save: boolean): Promise<any> {
    const requestBody = {
      serviceName: 'ParcelamentoSP.parcelar',
      requestBody: {
        parcel: {
          save: save ? 'S' : 'N',
          nroparcel: String(params.nroparcel),
          cpyrat: 'S',
          txjur: String(params.txjur),
          txmul: String(params.txmul),
          hist: 'N',
          calc: 'S',
          considerarEntradaCalcJuroMulta: 'N',
          tip: '0',
          jur: String(params.jur ?? 0),
          mul: String(params.mul ?? 0),
          calcDesc: '0',
          usaParamJUROSPCP: 'S',
          desdobInicial: 1,
          varCambialJurMult: 'N',
          zerarJuroMulta: 'N',
          chkComEntrada: params.comEntrada ? 'S' : 'N',
          recalcularTaxaAdministradora: 'N',
          priceJurMulDesc: 'N',
          codTipTit: params.codTipTit,
          codConta: params.codConta,
          freq: { value: String(params.freq), dias: 0 },
          venc: { value: String(params.venc), nova: params.novaDataVencimento ?? '' },
          tits: { nufins: params.nufins.join(',') },
          negoc: { value: String(params.negoc) },
          empresaNovosTitulos: { value: params.empresaNovosTitulos },
        },
        clientEventList: { clientEvent: CLIENT_EVENTS },
      },
    };

    return this.sankhyaGateway.serviceCall(
      'ParcelamentoSP.parcelar',
      requestBody,
      'mgefin',
    );
  }

  private parseSimulacao(data: any): SimulacaoResultado {
    const responseBody = data?.responseBody ?? {};

    const parceladosRow = responseBody?.parcelados?.ROW;
    const originaisRow = responseBody?.originais?.ROW;

    const parcelas = this.normalizeArray(parceladosRow);
    const originais = this.normalizeArray(originaisRow);

    return { parcelas, originais };
  }

  private parseConfirmacao(data: any): ConfirmacaoResultado {
    const responseBody = data?.responseBody ?? {};

    const nureneg = this.extractNureneg(responseBody);

    return {
      nureneg,
      nufins: [],
      parcelasGeradas: [],
      raw: responseBody,
    };
  }

  private async buscarParcelasGeradas(nureneg: number): Promise<ParcelaGerada[]> {
    if (!nureneg) return [];
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT FIN.NUFIN, FIN.DESDOBRAMENTO,
             TO_CHAR(FIN.DTVENC, 'DD/MM/YYYY HH24:MI:SS') AS DTVENC,
             FIN.VLRDESDOB
      FROM TGFFIN FIN
      WHERE FIN.NURENEG = ${nureneg}
        AND FIN.RECDESP = 1
      ORDER BY FIN.DESDOBRAMENTO ASC
    `);

    return rows.map((row: any) => ({
      nuFin: parseInt(row.NUFIN) || 0,
      desdobramento: row.DESDOBRAMENTO || '',
      dataVencimento: row.DTVENC || '',
      valor: parseFloat(row.VLRDESDOB) || 0,
    }));
  }

  private extractNureneg(responseBody: any): number {
    const candidates = [
      responseBody?.reneg?.nroReneg,
      responseBody?.reneg?.nureneg,
      responseBody?.reneg?.NURENEG,
      responseBody?.nureneg,
      responseBody?.nroReneg,
    ];

    for (const candidate of candidates) {
      const value = this.unwrap(candidate);
      const num = this.toNum(value);
      if (num !== undefined) return num;
    }

    return 0;
  }

  private normalizeArray(value: any): any[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  private unwrap(value: any): any {
    if (value && typeof value === 'object' && '$' in value) {
      return value.$;
    }
    return value;
  }

  private toNum(value: any): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    return isNaN(n) ? undefined : n;
  }
}
