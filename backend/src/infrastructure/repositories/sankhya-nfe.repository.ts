import { Injectable, NotFoundException } from '@nestjs/common';
import { SankhyaGateway } from '../sankhya/sankhya.gateway';
import { xml2jsParser } from './xml2js-parser';
import { NfeDados, NfeXml } from '../../domain/entities/nfe.entity';

const CHUNK_SIZE = 3900;

@Injectable()
export class SankhyaNfeRepository {
  constructor(private readonly sankhyaGateway: SankhyaGateway) {}

  private async findMeta(buscaValor: number, tipo: 'nunota' | 'numnota'): Promise<{ nunota: number; numnota: number; chave: string; xmlSize: number }> {
    const whereClause = tipo === 'numnota'
      ? `CAB.NUMNOTA = ${buscaValor}`
      : `NFE.NUNOTA = ${buscaValor}`;

    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT NFE.NUNOTA,
             CAB.NUMNOTA,
             NFE.CHAVENFE,
             DBMS_LOB.GETLENGTH(NFE.XML) AS XML_SIZE
      FROM TGFNFE NFE
      INNER JOIN TGFCAB CAB ON CAB.NUNOTA = NFE.NUNOTA
      WHERE ${whereClause}
        AND NFE.XML IS NOT NULL
        AND DBMS_LOB.GETLENGTH(NFE.XML) > 0
      ORDER BY NFE.NUNOTA DESC
    `);

    if (!rows || rows.length === 0) {
      throw new NotFoundException(`NFE nao encontrada para ${tipo.toUpperCase()} ${buscaValor}`);
    }

    const row = rows[0];
    return {
      nunota: parseInt(row.NUNOTA),
      numnota: parseInt(row.NUMNOTA),
      chave: row.CHAVENFE || '',
      xmlSize: parseInt(row.XML_SIZE) || 0,
    };
  }

  private async readXmlChunked(nunota: number, xmlSize: number): Promise<string> {
    if (xmlSize === 0) {
      throw new NotFoundException(`XML vazio para NUNOTA ${nunota}`);
    }

    const numChunks = Math.ceil(xmlSize / CHUNK_SIZE);
    const parts: string[] = [];

    for (let i = 0; i < numChunks; i++) {
      const offset = i * CHUNK_SIZE + 1;
      const rows = await this.sankhyaGateway.executeQuery(`
        SELECT DBMS_LOB.SUBSTR(XML, ${CHUNK_SIZE}, ${offset}) AS CHUNK
        FROM TGFNFE
        WHERE NUNOTA = ${nunota}
          AND ROWNUM <= 1
      `);

      if (rows && rows.length > 0 && rows[0].CHUNK) {
        parts.push(rows[0].CHUNK);
      }
    }

    const xml = parts.join('');
    if (!xml || xml.trim().length === 0) {
      throw new NotFoundException(`XML vazio para NUNOTA ${nunota}`);
    }

    return xml;
  }

  async findXmlByNunota(nunota: number): Promise<NfeXml> {
    const meta = await this.findMeta(nunota, 'nunota');
    const xml = await this.readXmlChunked(meta.nunota, meta.xmlSize);
    return { nunota: meta.nunota, numnota: meta.numnota, chave: meta.chave, xml };
  }

  async findXmlByNumNota(numnota: number): Promise<NfeXml> {
    const meta = await this.findMeta(numnota, 'numnota');
    const xml = await this.readXmlChunked(meta.nunota, meta.xmlSize);
    return { nunota: meta.nunota, numnota: meta.numnota, chave: meta.chave, xml };
  }

  async findDadosByNunota(nunota: number): Promise<NfeDados> {
    const nfeXml = await this.findXmlByNunota(nunota);
    return this.parseToDados(nfeXml);
  }

  async findDadosByNumNota(numnota: number): Promise<NfeDados> {
    const nfeXml = await this.findXmlByNumNota(numnota);
    return this.parseToDados(nfeXml);
  }

  private async parseToDados(nfeXml: NfeXml): Promise<NfeDados> {
    const parsed = await xml2jsParser.parse(nfeXml.xml);

    return {
      nunota: nfeXml.nunota,
      numnota: nfeXml.numnota,
      chave: parsed.chave || nfeXml.chave,
      modelo: parsed.modelo,
      status: parsed.status,
      dataEmissao: parsed.dataEmissao,
      dataSaida: parsed.dataSaida,
      numero: parsed.numero,
      serie: parsed.serie,
      naturezaOperacao: parsed.naturezaOperacao,
      emitente: parsed.emitente,
      destinatario: parsed.destinatario,
      itens: parsed.itens,
      totais: parsed.totais,
      transporte: parsed.transporte,
      pagamento: parsed.pagamento,
      qrCode: parsed.qrCode,
      xmlUrl: `/api/nfe/${nfeXml.nunota}/xml`,
    };
  }
}
