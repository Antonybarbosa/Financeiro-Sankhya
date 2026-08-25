import { Injectable } from '@nestjs/common';
import { SankhyaGateway } from '../infrastructure/sankhya/sankhya.gateway';

@Injectable()
export class TableInspectorService {
  constructor(private readonly sankhyaGateway: SankhyaGateway) {}

  async inspectTable(tableName: string): Promise<any[]> {
    const sanitizedTable = tableName.toUpperCase().replace(/[^A-Z0-9_]/g, '');

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
      WHERE utc.TABLE_NAME = '${sanitizedTable}'
      ORDER BY utc.COLUMN_ID
    `);

    return result;
  }
}