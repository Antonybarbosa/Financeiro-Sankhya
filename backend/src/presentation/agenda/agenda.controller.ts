import { Controller, Get, Query, Req } from '@nestjs/common';
import { SankhyaGateway } from '../../infrastructure/sankhya/sankhya.gateway';
import { IAuthUser } from '../../domain/repositories/auth.repository.interface';

@Controller('api/agenda')
export class AgendaController {
  constructor(private readonly sankhyaGateway: SankhyaGateway) {}

  @Get('hoje')
  async getAgendaHoje(
    @Req() req: Request & { user: IAuthUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const hoje = new Date();
    const dia = hoje.getDate().toString().padStart(2, '0');
    const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
    const ano = hoje.getFullYear();
    const dataConsulta = `${dia}/${mes}/${ano}`;

    const codAtendente = Math.floor(req.user?.codusu || 0);
    if (codAtendente <= 0) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 1,
        hasMore: false,
        dataConsulta,
        codAtendente: 0,
        totalReceber: 0,
        totalPagar: 0,
        message: 'Usuário sem codusu válido para filtrar atendente',
      };
    }

    const baseWhere = `FIN.DHBAIXA IS NULL
      AND FIN.PROVISAO <> 'N'
      AND FIN.VLRDESDOB > 0
      AND EXISTS (
        SELECT 1 FROM TGFTEL TEL
        WHERE TEL.CODPARC = FIN.CODPARC
          AND TEL.CODATENDENTE = ${codAtendente}
          AND TRUNC(TEL.DHCHAMADA) = TRUNC(SYSDATE)
      )`;

    const pageNum = Math.max(1, parseInt(page || '1'));
    const limitNum = Math.min(Math.max(1, parseInt(limit || '50')), 500);
    const offset = (pageNum - 1) * limitNum;

    const totaisRows = await this.sankhyaGateway.executeQuery(`
      SELECT COUNT(*) AS TOTAL,
             NVL(SUM(CASE WHEN FIN.RECDESP = 1
                          THEN FIN.VLRDESDOB - NVL(FIN.VLRBAIXA, 0) ELSE 0 END), 0) AS TOTAL_RECEBER,
             NVL(SUM(CASE WHEN FIN.RECDESP = -1
                          THEN FIN.VLRDESDOB - NVL(FIN.VLRBAIXA, 0) ELSE 0 END), 0) AS TOTAL_PAGAR
      FROM TGFFIN FIN
      WHERE ${baseWhere}
    `);

    const totaisRow = totaisRows[0] || {};
    const total = parseInt(totaisRow.TOTAL) || 0;
    const totalReceber = parseFloat(totaisRow.TOTAL_RECEBER) || 0;
    const totalPagar = parseFloat(totaisRow.TOTAL_PAGAR) || 0;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT * FROM (
        SELECT inner_q.*, ROWNUM AS RN FROM (
          SELECT FIN.NUFIN,
                 FIN.CODPARC,
                 PAR.NOMEPARC,
                 FIN.NUMNOTA,
                 FIN.NUMDUPL,
                 FIN.DESDOBRAMENTO,
                 FIN.DTVENC,
                 FIN.DTNEG,
                 FIN.VLRDESDOB,
                 FIN.VLRBAIXA,
                 FIN.RECDESP,
                 FIN.HISTORICO,
                 FIN.CODEMP,
                 FIN.DHBAIXA,
                 FIN.PROVISAO
          FROM TGFFIN FIN
          INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
          WHERE ${baseWhere}
          ORDER BY FIN.DTVENC ASC
        ) inner_q
        WHERE ROWNUM <= ${offset + limitNum}
      )
      WHERE RN > ${offset}
    `);

    const agendamentos = rows.map((row: any) => {
      const valorOriginal = parseFloat(row.VLRDESDOB) || 0;
      const valorBaixado = parseFloat(row.VLRBAIXA) || 0;
      const valorEmAberto = Math.max(0, valorOriginal - valorBaixado);
      const recDesp = parseInt(row.RECDESP) || 1;

      return {
        nuFin: row.NUFIN,
        codparc: row.CODPARC,
        nomeParceiro: row.NOMEPARC,
        numnota: row.NUMNOTA,
        numdupl: row.NUMDUPL,
        desdobramento: row.DESDOBRAMENTO,
        dataVencimento: row.DTVENC,
        dataNegociacao: row.DTNEG,
        valor: valorOriginal,
        valorEmAberto,
        valorBaixado,
        baixado: row.DHBAIXA !== null,
        tipo: recDesp === 1 ? 'A RECEBER' : 'A PAGAR',
        historico: row.HISTORICO,
        codemp: row.CODEMP,
      };
    });

    return {
      data: agendamentos,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasMore: pageNum < totalPages,
      dataConsulta,
      codAtendente,
      totalReceber,
      totalPagar,
    };
  }
}
