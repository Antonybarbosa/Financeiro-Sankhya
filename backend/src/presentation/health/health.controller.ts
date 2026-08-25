import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SankhyaGateway } from '../../infrastructure/sankhya/sankhya.gateway';
import { TableInspectorService } from '../../scripts/table-inspector.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly sankhyaGateway: SankhyaGateway,
    private readonly tableInspectorService: TableInspectorService,
  ) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'financeiro-sankhya',
    };
  }

  @Get('tgfpar-situacao')
  async getTgfparSituacao() {
    const result = await this.sankhyaGateway.executeQuery(`
      SELECT SITUACAO, ATIVO, COUNT(*) AS QTD
      FROM TGFPAR
      GROUP BY SITUACAO, ATIVO
      ORDER BY QTD DESC
    `);

    return { valores: result };
  }

  @Get('tgfpar-columns')
  async getTgfparColumns() {
    const result = await this.sankhyaGateway.executeQuery(`
      SELECT
        utc.COLUMN_ID,
        utc.COLUMN_NAME,
        utc.DATA_TYPE,
        utc.DATA_LENGTH,
        utc.DATA_PRECISION,
        utc.DATA_SCALE,
        utc.NULLABLE,
        ucc.COMMENTS
      FROM USER_TAB_COLUMNS utc
      LEFT JOIN USER_COL_COMMENTS ucc
             ON utc.TABLE_NAME = ucc.TABLE_NAME
            AND utc.COLUMN_NAME = ucc.COLUMN_NAME
      WHERE utc.TABLE_NAME = 'TGFPAR'
      ORDER BY utc.COLUMN_ID
    `);

    return {
      table: 'TGFPAR',
      columns: result,
      total: result.length,
    };
  }

  @Get('table-columns')
  async getTableColumns(@Query('table') table: string) {
    if (!table) {
      throw new Error('Table name is required');
    }

    const sanitizedTable = table.toUpperCase().replace(/[^A-Z0-9_]/g, '');

    const result = await this.tableInspectorService.inspectTable(sanitizedTable);

    return {
      table: sanitizedTable,
      columns: result,
      total: result.length,
    };
  }
}