import { Injectable } from '@nestjs/common';
import { SankhyaGateway } from '../sankhya/sankhya.gateway';
import { chunkedIn } from '../sankhya/sql-utils';
import {
  ITituloRepository,
  FilaItem,
  FilaCobrancaResult,
  FilaCobrancaOptions,
  BoletoDados,
  ResumoFinanceiroParceiro,
  ResumoFinanceiroAgregado,
  MetasPerformanceRawRow,
} from '../../domain/repositories/titulo.repository.interface';
import { Titulo, StatusTitulo } from '../../domain/entities/titulo.entity';

const TITULO_FIELDS = [
  'NUFIN',
  'NUNOTA',
  'NUMNOTA',
  'SERIENOTA',
  'DESDOBRAMENTO',
  'CODPARC',
  'CODEMP',
  'NUMDUPL',
  'NOSSONUM',
  'HISTORICO',
  'VLRDESDOB',
  'VLRBAIXA',
  'VLRDESC',
  'VLRJURO',
  'VLRMULTA',
  'DTVENC',
  'DTNEG',
  'DHBAIXA',
  'RECDESP',
  'PROVISAO',
  'CODIGOBARRA',
  'LINHADIGITAVEL',
];

const NFE_EXISTS = `CASE WHEN EXISTS (
  SELECT 1 FROM TGFNFE NFE
  WHERE NFE.NUNOTA = FIN.NUNOTA
    AND NFE.XML IS NOT NULL
    AND DBMS_LOB.GETLENGTH(NFE.XML) > 0
) THEN 1 ELSE 0 END AS HAS_NFE`;

const PARCEIRO_JOIN = {
  path: 'Parceiro',
  fieldset: { list: 'NOMEPARC, CGC_CPF, TELEFONE, EMAIL' },
};

@Injectable()
export class SankhyaTituloRepository implements ITituloRepository {
  constructor(private readonly sankhyaGateway: SankhyaGateway) {}

  async findById(id: number): Promise<Titulo | null> {
    const result = await this.sankhyaGateway.executeQuery(`
      SELECT FIN.NUFIN, FIN.NUNOTA, FIN.NUMNOTA, FIN.SERIENOTA, FIN.DESDOBRAMENTO,
             FIN.CODPARC, PAR.NOMEPARC, FIN.CODEMP, FIN.NUMDUPL, FIN.NOSSONUM,
             FIN.HISTORICO, FIN.VLRDESDOB, FIN.VLRBAIXA, FIN.VLRDESC, FIN.VLRJURO,
             FIN.VLRMULTA, FIN.DTVENC, FIN.DTNEG, FIN.DHBAIXA, FIN.RECDESP,
             FIN.PROVISAO, FIN.CODIGOBARRA, FIN.LINHADIGITAVEL, FIN.NURENEG,
             ${NFE_EXISTS}
       FROM TGFFIN FIN
       INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
       WHERE FIN.NUFIN = ${id}
         AND FIN.RECDESP = 1
         AND ROWNUM <= 1
    `);

    if (result.length === 0) return null;
    return this.mapQueryToTitulo(result[0]);
  }

  async findBoleto(id: number): Promise<BoletoDados | null> {
    const result = await this.sankhyaGateway.executeQuery(`
      SELECT FIN.NUFIN, FIN.CODEMP, FIN.NUMNOTA, FIN.NUMDUPL, FIN.DESDOBRAMENTO,
             FIN.NOSSONUM, FIN.CODIGOBARRA, FIN.LINHADIGITAVEL, FIN.CODBCO,
             FIN.VLRDESDOB, FIN.DTVENC, FIN.DTNEG,
             FIN.VLRJURO, FIN.TIPJURO, FIN.VLRMULTA, FIN.TIPMULTA, FIN.VLRDESC,
             PAR.CODPARC, PAR.NOMEPARC, PAR.CGC_CPF,
             ENDP.NOMEEND AS LOGRADOURO, PAR.NUMEND, PAR.COMPLEMENTO, PAR.CEP,
              CID.NOMECID AS CIDADE, UFS.UF AS UF,
              CMP.NOMEFANTASIA, CMP.RAZAOSOCIAL AS CEDENTE_RAZAO, CMP.CGC AS CEDENTE_CGC,
              CMP.NUMEND AS CEDENTE_NUMEND, CMP.COMPLEMENTO AS CEDENTE_COMPLEMENTO,
              CMP.CEP AS CEDENTE_CEP,
              CMPEND.NOMEEND AS CEDENTE_LOGRADOURO,
              CMPCID.NOMECID AS CEDENTE_CIDADE, CMPUFS.UF AS CEDENTE_UF,
              CTA.CARTEIRA AS CONTA_CARTEIRA, CTA.CODAGE AS CONTA_AGENCIA,
              CTA.CONVENIO AS CONTA_CONVENIO, CTA.DIASPROT AS CONTA_DIAS_PROTESTO
      FROM TGFFIN FIN
      INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
      LEFT JOIN TSIEND ENDP ON ENDP.CODEND = PAR.CODEND
      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
      LEFT JOIN TSIEMP CMP ON CMP.CODEMP = FIN.CODEMP
      LEFT JOIN TSIEND CMPEND ON CMPEND.CODEND = CMP.CODEND
      LEFT JOIN TSICID CMPCID ON CMPCID.CODCID = CMP.CODCID
      LEFT JOIN TSIUFS CMPUFS ON CMPUFS.CODUF = CMPCID.UF
      LEFT JOIN TSICTA CTA ON CTA.CODCTABCOINT = FIN.CODCTABCOINT
      WHERE FIN.NUFIN = ${id}
        AND FIN.RECDESP = 1
        AND ROWNUM <= 1
    `);

    if (result.length === 0) return null;
    return this.mapToBoleto(result[0]);
  }

  async findByCliente(clienteId: number): Promise<Titulo[]> {
    const result = await this.sankhyaGateway.executeQuery(`
      SELECT FIN.NUFIN, FIN.NUNOTA, FIN.NUMNOTA, FIN.SERIENOTA, FIN.DESDOBRAMENTO,
             FIN.CODPARC, PAR.NOMEPARC, FIN.CODEMP, FIN.NUMDUPL, FIN.NOSSONUM,
             FIN.HISTORICO, FIN.VLRDESDOB, FIN.VLRBAIXA, FIN.VLRDESC, FIN.VLRJURO,
             FIN.VLRMULTA, FIN.DTVENC, FIN.DTNEG, FIN.DHBAIXA, FIN.RECDESP,
              FIN.PROVISAO, FIN.CODIGOBARRA, FIN.LINHADIGITAVEL, FIN.NURENEG,
              ${NFE_EXISTS}
      FROM TGFFIN FIN
      INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
      WHERE FIN.CODPARC = ${clienteId}
        AND FIN.RECDESP = 1
        AND FIN.PROVISAO <> 'S'
        AND FIN.DHBAIXA IS NULL
        AND FIN.VLRDESDOB > 0
        AND NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0) > 0
      ORDER BY FIN.DTVENC ASC
    `);

    return result.map(t => this.mapQueryToTitulo(t));
  }

  async findVencidos(diasAtrasoMin: number = 0, diasAtrasoMax: number = 9999): Promise<Titulo[]> {
    const result = await this.sankhyaGateway.executeQuery(`
      SELECT FIN.NUFIN, FIN.NUNOTA, FIN.NUMNOTA, FIN.SERIENOTA, FIN.DESDOBRAMENTO,
             FIN.CODPARC, PAR.NOMEPARC, FIN.CODEMP, FIN.NUMDUPL, FIN.NOSSONUM,
             FIN.HISTORICO, FIN.VLRDESDOB, FIN.VLRBAIXA, FIN.VLRDESC, FIN.VLRJURO,
             FIN.VLRMULTA, FIN.DTVENC, FIN.DTNEG, FIN.DHBAIXA, FIN.RECDESP,
              FIN.PROVISAO, FIN.CODIGOBARRA, FIN.LINHADIGITAVEL, FIN.NURENEG,
              ${NFE_EXISTS}
      FROM TGFFIN FIN
      INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
      WHERE FIN.RECDESP = 1
        AND FIN.PROVISAO <> 'S'
        AND FIN.DHBAIXA IS NULL
        AND FIN.DTVENC < TRUNC(SYSDATE) - ${diasAtrasoMin}
        AND FIN.DTVENC >= TRUNC(SYSDATE) - ${diasAtrasoMax}
        AND FIN.VLRDESDOB > 0
      ORDER BY FIN.DTVENC ASC
    `);

    return result.map(t => this.mapQueryToTitulo(t));
  }

  async findA_vencer(dias: number = 7): Promise<Titulo[]> {
    const result = await this.sankhyaGateway.executeQuery(`
      SELECT FIN.NUFIN, FIN.NUNOTA, FIN.NUMNOTA, FIN.SERIENOTA, FIN.DESDOBRAMENTO,
             FIN.CODPARC, PAR.NOMEPARC, FIN.CODEMP, FIN.NUMDUPL, FIN.NOSSONUM,
             FIN.HISTORICO, FIN.VLRDESDOB, FIN.VLRBAIXA, FIN.VLRDESC, FIN.VLRJURO,
             FIN.VLRMULTA, FIN.DTVENC, FIN.DTNEG, FIN.DHBAIXA, FIN.RECDESP,
              FIN.PROVISAO, FIN.CODIGOBARRA, FIN.LINHADIGITAVEL, FIN.NURENEG,
              ${NFE_EXISTS}
      FROM TGFFIN FIN
      INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
      WHERE FIN.RECDESP = 1
        AND FIN.PROVISAO <> 'S'
        AND FIN.DHBAIXA IS NULL
        AND FIN.DTVENC >= TRUNC(SYSDATE)
        AND FIN.DTVENC <= TRUNC(SYSDATE) + ${dias}
        AND FIN.VLRDESDOB > 0
      ORDER BY FIN.DTVENC ASC
    `);

    return result.map(t => this.mapQueryToTitulo(t));
  }

  async findEmAberto(): Promise<Titulo[]> {
    const result = await this.sankhyaGateway.executeQuery(`
      SELECT FIN.NUFIN, FIN.NUNOTA, FIN.NUMNOTA, FIN.SERIENOTA, FIN.DESDOBRAMENTO,
             FIN.CODPARC, PAR.NOMEPARC, FIN.CODEMP, FIN.NUMDUPL, FIN.NOSSONUM,
             FIN.HISTORICO, FIN.VLRDESDOB, FIN.VLRBAIXA, FIN.VLRDESC, FIN.VLRJURO,
             FIN.VLRMULTA, FIN.DTVENC, FIN.DTNEG, FIN.DHBAIXA, FIN.RECDESP,
              FIN.PROVISAO, FIN.CODIGOBARRA, FIN.LINHADIGITAVEL, FIN.NURENEG,
              ${NFE_EXISTS}
      FROM TGFFIN FIN
      INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
      WHERE FIN.RECDESP = 1
        AND FIN.PROVISAO <> 'S'
        AND FIN.DHBAIXA IS NULL
        AND FIN.VLRDESDOB > 0
      ORDER BY FIN.DTVENC ASC
    `);

    return result.map(t => this.mapQueryToTitulo(t));
  }

  async findPorStatus(status: StatusTitulo): Promise<Titulo[]> {
    let whereClause = '';

    switch (status) {
      case StatusTitulo.PENDENTE:
        whereClause = "FIN.DHBAIXA IS NULL AND FIN.DTVENC >= TRUNC(SYSDATE)";
        break;
      case StatusTitulo.VENCIDO:
        whereClause = "FIN.DHBAIXA IS NULL AND FIN.DTVENC < TRUNC(SYSDATE)";
        break;
      case StatusTitulo.PAGO:
      case StatusTitulo.BAIXADO:
        whereClause = "FIN.DHBAIXA IS NOT NULL AND FIN.VLRBAIXA >= FIN.VLRDESDOB";
        break;
      case StatusTitulo.BAIXA_PARCIAL:
        whereClause = "FIN.DHBAIXA IS NOT NULL AND FIN.VLRBAIXA < FIN.VLRDESDOB AND FIN.VLRBAIXA > 0";
        break;
      default:
        whereClause = "1=1";
    }

    const result = await this.sankhyaGateway.executeQuery(`
      SELECT FIN.NUFIN, FIN.NUNOTA, FIN.NUMNOTA, FIN.SERIENOTA, FIN.DESDOBRAMENTO,
             FIN.CODPARC, PAR.NOMEPARC, FIN.CODEMP, FIN.NUMDUPL, FIN.NOSSONUM,
             FIN.HISTORICO, FIN.VLRDESDOB, FIN.VLRBAIXA, FIN.VLRDESC, FIN.VLRJURO,
             FIN.VLRMULTA, FIN.DTVENC, FIN.DTNEG, FIN.DHBAIXA, FIN.RECDESP,
              FIN.PROVISAO, FIN.CODIGOBARRA, FIN.LINHADIGITAVEL, FIN.NURENEG,
              ${NFE_EXISTS}
      FROM TGFFIN FIN
      INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
      WHERE FIN.RECDESP = 1
        AND FIN.PROVISAO <> 'S'
        AND ${whereClause}
        AND FIN.VLRDESDOB > 0
      ORDER BY FIN.DTVENC ASC
    `);

    return result.map(t => this.mapQueryToTitulo(t));
  }

  async findPorPeriodo(dataInicio: Date, dataFim: Date): Promise<Titulo[]> {
    const dtIni = this.formatDate(dataInicio);
    const dtFim = this.formatDate(dataFim);

    const result = await this.sankhyaGateway.executeQuery(`
      SELECT FIN.NUFIN, FIN.NUNOTA, FIN.NUMNOTA, FIN.SERIENOTA, FIN.DESDOBRAMENTO,
             FIN.CODPARC, PAR.NOMEPARC, FIN.CODEMP, FIN.NUMDUPL, FIN.NOSSONUM,
             FIN.HISTORICO, FIN.VLRDESDOB, FIN.VLRBAIXA, FIN.VLRDESC, FIN.VLRJURO,
             FIN.VLRMULTA, FIN.DTVENC, FIN.DTNEG, FIN.DHBAIXA, FIN.RECDESP,
              FIN.PROVISAO, FIN.CODIGOBARRA, FIN.LINHADIGITAVEL, FIN.NURENEG,
              ${NFE_EXISTS}
      FROM TGFFIN FIN
      INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
      WHERE FIN.RECDESP = 1
        AND FIN.PROVISAO <> 'S'
        AND FIN.DTNEG >= TO_DATE('${dtIni}', 'DD/MM/YYYY')
        AND FIN.DTNEG <= TO_DATE('${dtFim}', 'DD/MM/YYYY')
        AND FIN.VLRDESDOB > 0
      ORDER BY FIN.DTNEG DESC
    `);

    return result.map(t => this.mapQueryToTitulo(t));
  }

  async findBaixadosPorPeriodo(dataInicio: Date, dataFim: Date): Promise<Titulo[]> {
    const dtIni = this.formatDate(dataInicio);
    const dtFim = this.formatDate(dataFim);

    const result = await this.sankhyaGateway.executeQuery(`
      SELECT FIN.NUFIN, FIN.NUNOTA, FIN.NUMNOTA, FIN.SERIENOTA, FIN.DESDOBRAMENTO,
             FIN.CODPARC, PAR.NOMEPARC, FIN.CODEMP, FIN.NUMDUPL, FIN.NOSSONUM,
             FIN.HISTORICO, FIN.VLRDESDOB, FIN.VLRBAIXA, FIN.VLRDESC, FIN.VLRJURO,
             FIN.VLRMULTA, FIN.DTVENC, FIN.DTNEG, FIN.DHBAIXA, FIN.RECDESP,
              FIN.PROVISAO, FIN.CODIGOBARRA, FIN.LINHADIGITAVEL, FIN.NURENEG,
              ${NFE_EXISTS}
      FROM TGFFIN FIN
      INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
      WHERE FIN.RECDESP = 1
        AND FIN.PROVISAO <> 'S'
        AND FIN.DHBAIXA IS NOT NULL
        AND FIN.DHBAIXA >= TO_DATE('${dtIni}', 'DD/MM/YYYY')
        AND FIN.DHBAIXA <= TO_DATE('${dtFim}', 'DD/MM/YYYY')
        AND FIN.VLRDESDOB > 0
      ORDER BY FIN.DHBAIXA DESC
    `);

    return result.map(t => this.mapQueryToTitulo(t));
  }

  async findFilaCobranca(opts: FilaCobrancaOptions = {}): Promise<FilaCobrancaResult> {
    const {
      apenasVencidos = false,
      busca,
      page = 1,
      limit = 20,
    } = opts;

    const conditions: string[] = [
      'FIN.RECDESP = 1',
      "FIN.PROVISAO <> 'S'",
      'FIN.DHBAIXA IS NULL',
      'FIN.VLRDESDOB > 0',
    ];

    if (apenasVencidos) {
      conditions.push('FIN.DTVENC < TRUNC(SYSDATE)');
    }

    if (busca && busca.trim()) {
      const sanitized = busca.trim().toUpperCase().replace(/'/g, "''");
      conditions.push(`(UPPER(PAR.NOMEPARC) LIKE '%${sanitized}%' OR PAR.CGC_CPF LIKE '%${sanitized}%')`);
    }

    const whereClause = conditions.join('\n        AND ');

    const offset = (page - 1) * limit;

    const [dataRows, countRows] = await Promise.all([
      this.sankhyaGateway.executeQuery(`
        SELECT * FROM (
          SELECT
            FIN.CODPARC,
            MAX(PAR.NOMEPARC) AS NOMEPARC,
            MAX(PAR.TELEFONE) AS TELEFONE,
            MAX(PAR.EMAIL) AS EMAIL,
            MAX(PAR.CGC_CPF) AS CGC_CPF,
            MAX(PAR.RAZAOSOCIAL) AS RAZAOSOCIAL,
            MAX(PAR.TIPPESSOA) AS TIPO,
            MAX(PAR.IDENTINSCESTAD) AS INSCREST,
            MAX(PAR.NUMEND) AS NUMEND,
            MAX(PAR.COMPLEMENTO) AS COMPLEMENTO,
            MAX(PAR.CEP) AS CEP,
            MAX(ENDP.NOMEEND) AS LOGRADOURO,
            MAX(BAI.NOMEBAI) AS BAIRRO,
            MAX(CID.NOMECID) AS CIDADE,
            MAX(UFS.UF) AS UF,
            COUNT(*) AS QTD_TITULOS,
            SUM(CASE WHEN FIN.DTVENC < TRUNC(SYSDATE) THEN 1 ELSE 0 END) AS QTD_VENCIDOS,
            SUM(CASE WHEN FIN.DTVENC >= TRUNC(SYSDATE) THEN 1 ELSE 0 END) AS QTD_AVENCER,
            SUM(NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0)) AS VALOR_TOTAL,
            SUM(CASE WHEN FIN.DTVENC < TRUNC(SYSDATE)
                     THEN NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0)
                     ELSE 0 END) AS VALOR_VENCIDO,
            SUM(CASE WHEN FIN.DTVENC >= TRUNC(SYSDATE)
                     THEN NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0)
                     ELSE 0 END) AS VALOR_AVENCER,
            MIN(FIN.DTVENC) AS PRIMEIRO_VENC,
            MAX(FIN.DTVENC) AS ULTIMO_VENC,
            TRUNC(SYSDATE) - MIN(FIN.DTVENC) AS DIAS_ATRASO_MAX,
            ROW_NUMBER() OVER (ORDER BY
              SUM(CASE WHEN FIN.DTVENC < TRUNC(SYSDATE)
                       THEN NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0)
                       ELSE 0 END) DESC,
              TRUNC(SYSDATE) - MIN(FIN.DTVENC) DESC
            ) AS RN
          FROM TGFFIN FIN
          INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
          LEFT JOIN TSIEND ENDP ON ENDP.CODEND = PAR.CODEND
          LEFT JOIN TSIBAI BAI ON BAI.CODBAI = PAR.CODBAI
          LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
          LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
          WHERE ${whereClause}
          GROUP BY FIN.CODPARC
          HAVING SUM(NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0)) > 0
        )
        WHERE RN > ${offset}
          AND RN <= ${offset + limit}
      `),
      this.sankhyaGateway.executeQuery(`
        SELECT COUNT(*) AS TOTAL FROM (
          SELECT FIN.CODPARC
          FROM TGFFIN FIN
          INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
          WHERE ${whereClause}
          GROUP BY FIN.CODPARC
          HAVING SUM(NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0)) > 0
        )
      `),
    ]);

    const total = countRows.length > 0 ? parseInt(countRows[0].TOTAL) || 0 : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const items: FilaItem[] = dataRows.map((row: any) => {
      const valorTotal = parseFloat(row.VALOR_TOTAL) || 0;
      const valorVencido = parseFloat(row.VALOR_VENCIDO) || 0;
      const diasAtraso = parseInt(row.DIAS_ATRASO_MAX) || 0;

      return {
        parceiroId: parseInt(row.CODPARC),
        parceiroNome: row.NOMEPARC || '',
        telefone: row.TELEFONE || null,
        email: row.EMAIL || null,
        cnpjCpf: row.CGC_CPF || null,
        razaoSocial: row.RAZAOSOCIAL || null,
        tipoPessoa: row.TIPO || null,
        pessoFisJur: row.TIPO || null,
        inscricaoEstadual: row.INSCREST || null,
        logradouro: row.LOGRADOURO || null,
        numeroEnd: row.NUMEND || null,
        complemento: row.COMPLEMENTO || null,
        cep: row.CEP || null,
        bairro: row.BAIRRO || null,
        cidade: row.CIDADE || null,
        uf: row.UF || null,
        qtdTitulos: parseInt(row.QTD_TITULOS) || 0,
        qtdVencidos: parseInt(row.QTD_VENCIDOS) || 0,
        qtdAvencer: parseInt(row.QTD_AVENCER) || 0,
        valorTotal,
        valorVencido,
        valorAvencer: parseFloat(row.VALOR_AVENCER) || 0,
        primeiroVencimento: row.PRIMEIRO_VENC ? this.parseDate(row.PRIMEIRO_VENC) : null,
        ultimoVencimento: row.ULTIMO_VENC ? this.parseDate(row.ULTIMO_VENC) : null,
        diasAtrasoMax: diasAtraso,
        prioridade: Math.round(valorVencido * (1 + diasAtraso / 30)),
        pendente: null,
      };
    });

    await this.aplicarOverlayPendente(items);

    return { items, total, page, limit, totalPages };
  }

  async findResumoFinanceiroPorParceiros(parceiroIds: number[]): Promise<ResumoFinanceiroParceiro[]> {
    if (parceiroIds.length === 0) return [];
    const inClause = chunkedIn('FIN.CODPARC', parceiroIds);
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT
        FIN.CODPARC AS CODPARC,
        SUM(CASE WHEN FIN.DTVENC < TRUNC(SYSDATE)
                 THEN NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0)
                 ELSE 0 END) AS VALOR_VENCIDO,
        MAX(TRUNC(SYSDATE) - FIN.DTVENC) AS DIAS_ATRASO_MAX,
        COUNT(*) AS QTD_TITULOS,
        SUM(CASE WHEN FIN.DTVENC < TRUNC(SYSDATE) THEN 1 ELSE 0 END) AS QTD_VENCIDOS
      FROM TGFFIN FIN
      WHERE FIN.RECDESP = 1
        AND FIN.PROVISAO <> 'S'
        AND FIN.DHBAIXA IS NULL
        AND FIN.VLRDESDOB > 0
        AND NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0) > 0
        AND ${inClause}
      GROUP BY FIN.CODPARC
    `);

    return rows.map((row: any) => ({
      parceiroId: parseInt(row.CODPARC),
      valorVencido: parseFloat(row.VALOR_VENCIDO) || 0,
      diasAtrasoMax: Math.max(0, parseInt(row.DIAS_ATRASO_MAX) || 0),
      qtdTitulos: parseInt(row.QTD_TITULOS) || 0,
      qtdVencidos: parseInt(row.QTD_VENCIDOS) || 0,
    }));
  }

  async findResumoFinanceiroAgregado(parceiroIds: number[]): Promise<ResumoFinanceiroAgregado> {
    if (parceiroIds.length === 0) {
      return {
        valorEmAberto: 0, valorVencido: 0, valorAvencer7d: 0,
        qtdTitulos: 0, qtdVencidos: 0, qtdAvencer7d: 0,
      };
    }
    const inClause = chunkedIn('FIN.CODPARC', parceiroIds);
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT
        COUNT(*) AS QTD_TITULOS,
        SUM(NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0)) AS VALOR_EM_ABERTO,
        SUM(CASE WHEN FIN.DTVENC < TRUNC(SYSDATE) THEN 1 ELSE 0 END) AS QTD_VENCIDOS,
        SUM(CASE WHEN FIN.DTVENC < TRUNC(SYSDATE)
                 THEN NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0) ELSE 0 END) AS VALOR_VENCIDO,
        SUM(CASE WHEN FIN.DTVENC BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 7
                 THEN 1 ELSE 0 END) AS QTD_AVENCER7,
        SUM(CASE WHEN FIN.DTVENC BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 7
                 THEN NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0) ELSE 0 END) AS VALOR_AVENCER7
      FROM TGFFIN FIN
      WHERE FIN.RECDESP = 1
        AND FIN.PROVISAO <> 'S'
        AND FIN.DHBAIXA IS NULL
        AND FIN.VLRDESDOB > 0
        AND NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0) > 0
        AND ${inClause}
    `);
    const row = rows[0] || {};
    return {
      valorEmAberto: parseFloat(row.VALOR_EM_ABERTO) || 0,
      valorVencido: parseFloat(row.VALOR_VENCIDO) || 0,
      valorAvencer7d: parseFloat(row.VALOR_AVENCER7) || 0,
      qtdTitulos: parseInt(row.QTD_TITULOS) || 0,
      qtdVencidos: parseInt(row.QTD_VENCIDOS) || 0,
      qtdAvencer7d: parseInt(row.QTD_AVENCER7) || 0,
    };
  }

  private async aplicarOverlayPendente(items: FilaItem[], codUsuarioLogado?: number): Promise<void> {
    if (items.length === 0) return;
    const parceiroIds = items.map(i => i.parceiroId);
    const inClause = chunkedIn('TEL.CODPARC', parceiroIds);
    const usuarioId = Math.floor(codUsuarioLogado || 0);
    const filtroUsuario = usuarioId > 0 ? `AND (TEL.CODATENDENTE = ${usuarioId} OR TEL.CODUSU = ${usuarioId})` : '';
    try {
      const rows = await this.sankhyaGateway.executeQuery(`
        SELECT CODPARC, PENDENTE FROM (
          SELECT TEL.CODPARC, TEL.PENDENTE,
                 ROW_NUMBER() OVER (PARTITION BY TEL.CODPARC ORDER BY TEL.DHCHAMADA DESC) AS RN
          FROM TGFTEL TEL
          WHERE TRUNC(TEL.DHCHAMADA) = TRUNC(SYSDATE) ${filtroUsuario}
            AND ${inClause}
        )
        WHERE RN = 1
      `);
      const mapaPendente = new Map<number, boolean>();
      for (const r of rows) {
        mapaPendente.set(parseInt(r.CODPARC), r.PENDENTE === 'S');
      }
      for (const item of items) {
        const p = mapaPendente.get(item.parceiroId);
        if (p !== undefined) item.pendente = p;
      }
    } catch {
      // Overlay é best-effort: se TGFTEL falhar, mantém null
    }
  }

  async findMetasPerformance(dtini: string, dtfim: string, codemp?: number): Promise<MetasPerformanceRawRow[]> {
    const codempFilter = codemp ? `CODEMP = ${codemp}` : '1=1';
    const codempFinFilter = codemp
      ? `fin.codemp IN (SELECT EMP.CODEMP FROM TSIEMP EMP WHERE EMP.CODEMPMATRIZ = ${codemp})`
      : '1=1';

    const sql = `
      SELECT REGRA, RECEBIDO, META, RECEBIDO*(PERC_COM/100) AS PREMIO, PERC_COM FROM
      (SELECT 
        NOME AS REGRA, SUM(valor) AS RECEBIDO, 
        NVL(
          (SELECT SUM(DECODE( NOME,' 1  A 5 ', META1, ' 6  A 15 ', META2, ' 16  A 30 ', META3, ' 31  A 90 ', META4,' 91 A 365 ',META5, 'ACIMA DE 365', META6, 'RENEGOCIADOS', META7)) 
           FROM AD_METASFIN 
           WHERE mes between extract(month from TO_DATE('${dtini}', 'DD/MM/YYYY')) and extract(month from TO_DATE('${dtfim}', 'DD/MM/YYYY'))
             and ano = to_char(to_date('${dtfim}','DD/MM/YYYY'),'YYYY')
             AND CODEMP NOT IN (3, 4)
             AND ${codempFilter}
          ), 0) AS META,
        ORDEM,
        NVL(
          (SELECT (DECODE( NOME,' 1  A 5 ', PERC1, ' 6  A 15 ', PERC2, ' 16  A 30 ', PERC3, ' 31  A 90 ', PERC4,' 91 A 365 ',PERC5, 'ACIMA DE 365', PERC6, 'RENEGOCIADOS', PERC7)) 
           FROM AD_METASFIN 
           WHERE mes between extract(month from TO_DATE('${dtini}', 'DD/MM/YYYY')) and extract(month from TO_DATE('${dtfim}', 'DD/MM/YYYY'))
             and ano = to_char(to_date('${dtfim}','DD/MM/YYYY'),'YYYY')
             AND CODEMP NOT IN (3, 4)
             AND ${codempFilter} AND ROWNUM = 1
          ), 0) AS PERC_COM
       FROM 
       (
        SELECT 
            PAR.CODPARC,PAR.RAZAOSOCIAL,PAR.DTCAD,
            trunc(DHBAIXA-dtvenc) as dias,
            dtvenc, DHBAIXA,
            fin.VLRBAIXA as valor, 
            NUFIN AS TITULOS, 
            CASE WHEN trunc(DHBAIXA-dtvenc) BETWEEN 1 AND 5 THEN ' 1  A 5 '
                WHEN trunc(DHBAIXA-dtvenc) BETWEEN 6 AND 15 THEN ' 6  A 15 '
                WHEN trunc(DHBAIXA-dtvenc) BETWEEN 16 AND 30 THEN ' 16  A 30 '
                WHEN trunc(DHBAIXA-dtvenc) BETWEEN 31 AND 90 THEN ' 31  A 90 '		
                WHEN trunc(DHBAIXA-dtvenc) BETWEEN 91 AND 365 THEN ' 91 A 365 ' 
                ELSE 'ACIMA DE 365' END AS NOME,
            CASE WHEN trunc(DHBAIXA-dtvenc) BETWEEN 1 AND 5 THEN 1
                WHEN trunc(DHBAIXA-dtvenc) BETWEEN 6 AND 15 THEN 2
                WHEN trunc(DHBAIXA-dtvenc) BETWEEN 16 AND 30 THEN 3
                WHEN trunc(DHBAIXA-dtvenc) BETWEEN 31 AND 90 THEN 4	
                WHEN trunc(DHBAIXA-dtvenc) BETWEEN 91 AND 365 THEN 5
                ELSE 6 END AS ORDEM, VLRJURO    
        FROM TGFFIN FIN, TGFPAR PAR 
        WHERE PAR.CODPARC = FIN.CODPARC
          AND FIN.DHBAIXA between TO_DATE('${dtini}', 'DD/MM/YYYY') and TO_DATE('${dtfim}', 'DD/MM/YYYY') + 0.99999
          AND FIN.DHBAIXA > FIN.DTVENC 
          AND FIN.RECDESP = 1 
          AND codtiptit NOT IN (11 ,20, 10,29,30,31,0)
          AND PAR.CLIENTE= 'S'
          AND PAR.ATIVO = 'S'
          AND FIN.PROVISAO = 'N'
          AND FIN.CODEMP NOT IN (3, 4)
          AND ${codempFinFilter}
          AND FIN.CODNAT NOT IN (10202002,10202005,10202007, 10401001, 10401002, 10401003, 20401001, 20401002, 20401003, 20401004, 20401005)
          AND FIN.CODPARC NOT IN (833,2507,36133, 792,791, 36081,36923, 833, 2507, 34412, 39417, 2814)

        UNION ALL

        (SELECT 
            PAR.CODPARC,PAR.RAZAOSOCIAL,PAR.DTCAD,
            trunc(DHBAIXA-dtvenc) as dias,
            dtvenc, DHBAIXA,
            fin.VLRBAIXA as valor, 
            NUFIN AS TITULOS, 
            'RENEGOCIADOS' AS NOME,
            7 AS ORDEM,
            VLRJURO
        FROM TGFFIN FIN, TGFPAR PAR 
        WHERE PAR.CODPARC = FIN.CODPARC
          AND FIN.DHBAIXA between TO_DATE('${dtini}', 'DD/MM/YYYY') and TO_DATE('${dtfim}', 'DD/MM/YYYY') + 0.99999
          AND NVL(NURENEG,0) <> 0
          AND FIN.RECDESP = 1 
          AND codtiptit NOT IN (11 ,20, 10,29,30,31,0)
          AND PAR.CLIENTE= 'S'
          AND PAR.ATIVO = 'S'
          AND FIN.PROVISAO = 'N'
          AND NVL(VLRJURO,0) <> 0 
          AND FIN.CODEMP NOT IN (3, 4)
          AND ${codempFinFilter}
          AND FIN.CODNAT NOT IN (10202002,10202005,10202007, 10401001, 10401002, 10401003, 20401001, 20401002, 20401003, 20401004, 20401005)
          AND FIN.CODPARC NOT IN (833,2507,36133, 792,791, 36081,36923, 833, 2507, 34412, 39417, 2814))
       )
       GROUP BY NOME, ORDEM)
      ORDER BY ORDEM
    `;

    try {
      const rows = await this.sankhyaGateway.executeQuery(sql);
      return rows.map((r: any) => ({
        regra: (r.REGRA || '').trim(),
        recebido: parseFloat(r.RECEBIDO) || 0,
        meta: parseFloat(r.META) || 0,
        premio: parseFloat(r.PREMIO) || 0,
        percCom: parseFloat(r.PERC_COM) || 0,
      }));
    } catch (error) {
      console.error('Erro ao executar query de MetasPerformance:', error);
      return [];
    }
  }

  async save(titulo: Titulo): Promise<Titulo> {
    await this.sankhyaGateway.saveRecord(
      'Financeiro',
      { NUFIN: titulo.id },
      ['HISTORICO'],
      [titulo.historico || ''],
    );
    return titulo;
  }

  async updateStatus(id: number, status: StatusTitulo): Promise<void> {
    if (status === StatusTitulo.PAGO || status === StatusTitulo.BAIXADO) {
      await this.sankhyaGateway.saveRecord(
        'Financeiro',
        { NUFIN: id },
        ['DHBAIXA'],
        [this.formatDateTime(new Date())],
      );
    }
  }

  async countPorStatus(): Promise<{ status: StatusTitulo; total: number; valor: number }[]> {
    const result = await this.sankhyaGateway.executeQuery(`
      SELECT
        CASE
          WHEN DHBAIXA IS NULL AND DTVENC < TRUNC(SYSDATE) THEN 'VENCIDO'
          WHEN DHBAIXA IS NULL AND DTVENC >= TRUNC(SYSDATE) THEN 'PENDENTE'
          WHEN DHBAIXA IS NOT NULL AND VLRBAIXA >= VLRDESDOB THEN 'BAIXADO'
          WHEN DHBAIXA IS NOT NULL AND VLRBAIXA < VLRDESDOB THEN 'BAIXA_PARCIAL'
          ELSE 'PENDENTE'
        END AS STATUS,
        COUNT(*) AS TOTAL,
        SUM(VLRDESDOB) AS VALOR
      FROM TGFFIN
      WHERE RECDESP = 1
        AND PROVISAO <> 'S'
        AND VLRDESDOB > 0
      GROUP BY
        CASE
          WHEN DHBAIXA IS NULL AND DTVENC < TRUNC(SYSDATE) THEN 'VENCIDO'
          WHEN DHBAIXA IS NULL AND DTVENC >= TRUNC(SYSDATE) THEN 'PENDENTE'
          WHEN DHBAIXA IS NOT NULL AND VLRBAIXA >= VLRDESDOB THEN 'BAIXADO'
          WHEN DHBAIXA IS NOT NULL AND VLRBAIXA < VLRDESDOB THEN 'BAIXA_PARCIAL'
          ELSE 'PENDENTE'
        END
    `);

    const statusMap: Record<string, StatusTitulo> = {
      'PENDENTE': StatusTitulo.PENDENTE,
      'VENCIDO': StatusTitulo.VENCIDO,
      'BAIXADO': StatusTitulo.BAIXADO,
      'BAIXA_PARCIAL': StatusTitulo.BAIXA_PARCIAL,
    };

    return result.map((row: any) => ({
      status: statusMap[row.STATUS] || StatusTitulo.PENDENTE,
      total: parseInt(row.TOTAL) || 0,
      valor: parseFloat(row.VALOR) || 0,
    }));
  }

  private mapToBoleto(data: any): BoletoDados {
    const numeroDocumento = [data.NUMNOTA, data.NUMDUPL].filter(Boolean).join('/');
    const endereco = [
      data.LOGRADOURO,
      data.NUMEND ? `nº ${data.NUMEND}` : '',
      data.COMPLEMENTO,
    ].filter(Boolean).join(', ');

    const enderecoCedente = [
      data.CEDENTE_LOGRADOURO,
      data.CEDENTE_NUMEND ? `nº ${data.CEDENTE_NUMEND}` : '',
      data.CEDENTE_COMPLEMENTO,
    ].filter(Boolean).join(', ');

    return {
      tituloId: parseInt(data.NUFIN),
      parceiroId: parseInt(data.CODPARC),
      numeroDocumento,
      desdobramento: data.DESDOBRAMENTO || '',
      nossoNumero: data.NOSSONUM || '',
      codigoBarras: data.CODIGOBARRA || '',
      linhaDigitavel: data.LINHADIGITAVEL || '',
      codigoBanco: data.CODBCO ? String(data.CODBCO).trim() : '',
      carteira: data.CONTA_CARTEIRA ? String(data.CONTA_CARTEIRA).trim() : '',
      agencia: data.CONTA_AGENCIA ? String(data.CONTA_AGENCIA).trim() : '',
      convenio: data.CONTA_CONVENIO ? String(data.CONTA_CONVENIO).trim() : '',
      diasProtesto: data.CONTA_DIAS_PROTESTO ? parseInt(data.CONTA_DIAS_PROTESTO) : null,
      valor: parseFloat(data.VLRDESDOB) || 0,
      desconto: parseFloat(data.VLRDESC) || 0,
      dataVencimento: this.parseDate(data.DTVENC),
      dataEmissao: this.parseDate(data.DTNEG),
      // TIPJURO/TIPMULTA na TGFFIN: '1' = percentual (VLR em %), '2' = valor em R$
      juros: parseFloat(data.VLRJURO) || null,
      jurosTipo: data.TIPJURO ? String(data.TIPJURO).trim() : '',
      multa: parseFloat(data.VLRMULTA) || null,
      multaTipo: data.TIPMULTA ? String(data.TIPMULTA).trim() : '',
      sacado: {
        nome: data.NOMEPARC || '',
        cnpjCpf: data.CGC_CPF || '',
        endereco,
        cep: data.CEP || '',
        cidade: data.CIDADE || '',
        uf: data.UF ? String(data.UF) : '',
      },
      cedente: {
        nome: data.CEDENTE_RAZAO || data.NOMEFANTASIA || '',
        razaoSocial: data.CEDENTE_RAZAO || '',
        cnpjCpf: data.CEDENTE_CGC || '',
        endereco: enderecoCedente,
        cep: data.CEDENTE_CEP || '',
        cidade: data.CEDENTE_CIDADE || '',
        uf: data.CEDENTE_UF ? String(data.CEDENTE_UF) : '',
      },
    };
  }

  private mapQueryToTitulo(data: any): Titulo {
    const valorOriginal = parseFloat(data.VLRDESDOB) || 0;
    const valorBaixado = parseFloat(data.VLRBAIXA) || 0;
    const valorDesconto = parseFloat(data.VLRDESC) || 0;
    const valorJuros = parseFloat(data.VLRJURO) || 0;
    const valorMulta = parseFloat(data.VLRMULTA) || 0;
    const valorEmAberto = Math.max(0, valorOriginal - valorBaixado - valorDesconto);

    const dtVencRaw = data.DTVENC;

    return Titulo.create({
      id: parseInt(data.NUFIN),
      nuNota: data.NUNOTA ? parseInt(data.NUNOTA) : null,
      numero: data.NUMNOTA?.toString() || '',
      numeroDupl: data.NUMDUPL ? parseInt(data.NUMDUPL) : null,
      serie: data.SERIENOTA || '',
      desdobramento: data.DESDOBRAMENTO || '',
      clienteId: parseInt(data.CODPARC),
      clienteNome: data.NOMEPARC || '',
      empresa: parseInt(data.CODEMP) || 0,
      valor: valorOriginal,
      valorBaixado,
      valorDesconto,
      valorJuros,
      valorMulta,
      valorEmAberto,
      dataVencimento: this.parseDate(dtVencRaw),
      dataEmissao: this.parseDate(data.DTNEG),
      dataBaixa: data.DHBAIXA ? this.parseDate(data.DHBAIXA) : null,
      recDesp: parseInt(data.RECDESP) || 1,
      status: this.derivarStatus(data.DHBAIXA, dtVencRaw, valorOriginal, valorBaixado),
      historico: data.HISTORICO || undefined,
      nossoNumero: data.NOSSONUM || undefined,
      codigoBarras: data.CODIGOBARRA || undefined,
      linhaDigitavel: data.LINHADIGITAVEL || undefined,
      nureneg: data.NURENEG ? parseInt(data.NURENEG) : null,
      hasNfe: data.HAS_NFE === 1 || data.HAS_NFE === '1' || data.HAS_NFE === true,
    });
  }

  private derivarStatus(
    dhBaixa: string | null,
    dtVenc: string | null,
    valorOriginal: number,
    valorBaixado: number,
  ): StatusTitulo {
    if (dhBaixa) {
      if (valorBaixado >= valorOriginal && valorOriginal > 0) {
        return StatusTitulo.BAIXADO;
      }
      if (valorBaixado > 0 && valorBaixado < valorOriginal) {
        return StatusTitulo.BAIXA_PARCIAL;
      }
    }

    if (dtVenc) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencimento = this.parseDate(dtVenc);
      vencimento.setHours(0, 0, 0, 0);

      if (vencimento < hoje) {
        return StatusTitulo.VENCIDO;
      }
    }

    return StatusTitulo.PENDENTE;
  }

  private parseDate(dateStr: string | Date | null): Date {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;

    const str = String(dateStr).trim();

    // Formato Sankhya: "31072026 00:00:00" (DDMMYYYY HH:MM:SS)
    const sankhyaMatch = str.match(/^(\d{2})(\d{2})(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (sankhyaMatch) {
      const [, dd, mm, yyyy, hh, mi, ss] = sankhyaMatch;
      return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(mi), parseInt(ss));
    }

    // Formato Sankhya sem hora: "31072026" (DDMMYYYY)
    const sankhyaDateOnly = str.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (sankhyaDateOnly) {
      const [, dd, mm, yyyy] = sankhyaDateOnly;
      return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    }

    // ISO: "2026-07-31T00:00:00.000Z" ou "2026-07-31"
    const iso = new Date(str);
    if (!isNaN(iso.getTime())) return iso;

    // Formato brasileiro: "31/07/2026" ou "31/07/2026 10:30"
    if (str.includes('/')) {
      const parts = str.split(/[\/ :]/);
      const year = parseInt(parts[2]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[0]);
      const hours = parseInt(parts[3] || '0');
      const minutes = parseInt(parts[4] || '0');
      return new Date(year, month, day, hours, minutes);
    }

    return new Date();
  }

  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private formatDateTime(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
}
