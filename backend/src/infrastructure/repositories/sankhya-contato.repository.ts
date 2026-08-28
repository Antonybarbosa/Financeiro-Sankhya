import { Injectable } from '@nestjs/common';
import { SankhyaGateway } from '../sankhya/sankhya.gateway';
import { IContatoRepository, AtendimentoHojeRow } from '../../domain/repositories/contato.repository.interface';
import { Contato, TipoContato, SituacaoContato } from '../../domain/entities/contato.entity';

const CONTATO_SELECT = `
  SELECT TEL.NUREL, TEL.CODPARC, PAR.NOMEPARC, TEL.DHCHAMADA, TEL.DHPROXCHAM,
         TEL.TIPCHAM, TEL.AD_TIPCHAMADA, TEL.AD_TIPO, TEL.AD_HISTORICO,
         TEL.AD_HISTCOBRA, TEL.COMENTARIOS, TEL.COMENTARIOS2, TEL.AD_MSG,
         TEL.PENDENTE, TEL.SITUACAO, TEL.CODUSU, TEL.CODATENDENTE,
         TEL.CODVEND, TEL.DTALTER
  FROM TGFTEL TEL
  INNER JOIN TGFPAR PAR ON PAR.CODPARC = TEL.CODPARC
`;

// Gravações usam saveRecordTelemarketing: o payload nativo da tela Relacionamento
// (dataSetID + crudListener + txProperties Telemarketing) aplica S→N (finalizar)
// com o usuário de integração — o payload simples é bloqueado com "Usuário logado
// não tem autorização para alterar este item!" (comprovado em scripts/debug-finalizar-*).

@Injectable()
export class SankhyaContatoRepository implements IContatoRepository {
  constructor(private readonly sankhyaGateway: SankhyaGateway) {}

  async findById(id: number): Promise<Contato | null> {
    const result = await this.sankhyaGateway.executeQuery(`
      ${CONTATO_SELECT}
      WHERE TEL.NUREL = ${id}
        AND ROWNUM <= 1
    `);

    if (result.length === 0) return null;
    return this.mapQueryToContato(result[0]);
  }

  async findByParceiro(parceiroId: number): Promise<Contato[]> {
    const result = await this.sankhyaGateway.executeQuery(`
      ${CONTATO_SELECT}
      WHERE TEL.CODPARC = ${parceiroId}
      ORDER BY TEL.DHCHAMADA DESC
    `);

    return result.map(c => this.mapQueryToContato(c));
  }

  async findByTipo(tipo: TipoContato): Promise<Contato[]> {
    const tipoMap: Record<TipoContato, string> = {
      [TipoContato.TELEFONE]: 'TEL',
      [TipoContato.WHATSAPP]: 'WA',
      [TipoContato.EMAIL]: 'EMA',
      [TipoContato.BOLETO]: 'BOL',
      [TipoContato.SMS]: 'SMS',
      [TipoContato.OUTRO]: 'OUT',
    };

    const result = await this.sankhyaGateway.executeQuery(`
      ${CONTATO_SELECT}
      WHERE TEL.AD_TIPCHAMADA = '${tipoMap[tipo]}'
         OR TEL.AD_TIPO LIKE '%${tipoMap[tipo]}%'
      ORDER BY TEL.DHCHAMADA DESC
    `);

    return result.map(c => this.mapQueryToContato(c));
  }

  async findBySituacao(situacao: SituacaoContato): Promise<Contato[]> {
    const sitMap: Record<SituacaoContato, string> = {
      [SituacaoContato.PENDENTE]: 'P',
      [SituacaoContato.EM_ANDAMENTO]: 'A',
      [SituacaoContato.CONCLUIDO]: 'C',
      [SituacaoContato.CANCELADO]: 'X',
    };

    const result = await this.sankhyaGateway.executeQuery(`
      ${CONTATO_SELECT}
      WHERE TEL.SITUACAO = '${sitMap[situacao]}'
      ORDER BY TEL.DHCHAMADA DESC
    `);

    return result.map(c => this.mapQueryToContato(c));
  }

  async findPendentes(codUsuarioLogado?: number): Promise<Contato[]> {
    const usuarioId = Math.floor(codUsuarioLogado || 0);
    const filtroUsuario = usuarioId > 0 ? `AND (TEL.CODATENDENTE = ${usuarioId} OR TEL.CODUSU = ${usuarioId})` : '';
    const result = await this.sankhyaGateway.executeQuery(`
      ${CONTATO_SELECT}
      WHERE TEL.PENDENTE = 'S' ${filtroUsuario}
      ORDER BY TEL.DHCHAMADA DESC
    `);

    return result.map(c => this.mapQueryToContato(c));
  }

  async findProximasChamadas(dias: number, codUsuarioLogado?: number): Promise<Contato[]> {
    const usuarioId = Math.floor(codUsuarioLogado || 0);
    const filtroUsuario = usuarioId > 0 ? `AND (TEL.CODATENDENTE = ${usuarioId} OR TEL.CODUSU = ${usuarioId})` : '';
    const result = await this.sankhyaGateway.executeQuery(`
      ${CONTATO_SELECT}
      WHERE TEL.DHPROXCHAM IS NOT NULL
        AND TEL.DHPROXCHAM <= TRUNC(SYSDATE) + ${dias}
        AND TEL.PENDENTE = 'S' ${filtroUsuario}
      ORDER BY TEL.DHPROXCHAM ASC
    `);

    return result.map(c => this.mapQueryToContato(c));
  }

  async findPorPeriodo(dataInicio: Date, dataFim: Date): Promise<Contato[]> {
    const dtIni = this.formatDate(dataInicio);
    const dtFim = this.formatDate(dataFim);

    const result = await this.sankhyaGateway.executeQuery(`
      ${CONTATO_SELECT}
      WHERE TEL.DHCHAMADA >= TO_DATE('${dtIni}', 'DD/MM/YYYY')
        AND TEL.DHCHAMADA <= TO_DATE('${dtFim} 23:59:59', 'DD/MM/YYYY HH24:MI:SS')
      ORDER BY TEL.DHCHAMADA DESC
    `);

    return result.map(c => this.mapQueryToContato(c));
  }

  async findByNuFin(nuFin: number): Promise<Contato[]> {
    const result = await this.sankhyaGateway.executeQuery(`
      ${CONTATO_SELECT}
      WHERE TEL.AD_MSG LIKE '%NUFIN=${nuFin}%'
         OR TEL.AD_HISTCOBRA LIKE '%NUFIN=${nuFin}%'
         OR TEL.COMENTARIOS LIKE '%${nuFin}%'
      ORDER BY TEL.DHCHAMADA DESC
    `);

    return result.map(c => this.mapQueryToContato(c));
  }

  async findAtendimentosHoje(codUsuarioLogado: number): Promise<AtendimentoHojeRow[]> {
    const usuarioId = Math.floor(codUsuarioLogado || 0);
    const filtroUsuario = usuarioId > 0 ? `AND (TEL.CODATENDENTE = ${usuarioId} OR TEL.CODUSU = ${usuarioId})` : '';
    const rows = await this.sankhyaGateway.executeQuery(
      `
      SELECT TEL.NUREL, TEL.CODPARC, PAR.NOMEPARC, PAR.TELEFONE, PAR.EMAIL,
             PAR.CGC_CPF, PAR.RAZAOSOCIAL, PAR.NOMEPARC, PAR.TIPPESSOA,
             PAR.IDENTINSCESTAD, PAR.CGC_CPF, PAR.NUMEND, PAR.COMPLEMENTO,
             PAR.CEP,
             ENDP.NOMEEND AS LOGRADOURO,
             BAI.NOMEBAI AS BAIRRO,
              CID.NOMECID AS CIDADE, UFS.UF AS UF,
             TEL.DHCHAMADA, TEL.DHPROXCHAM, TEL.PENDENTE,
             TEL.SITUACAO, TEL.AD_TIPCHAMADA, TEL.AD_TIPO, TEL.AD_HISTORICO,
             TEL.AD_HISTCOBRA, TEL.COMENTARIOS, TEL.AD_MSG
      FROM TGFTEL TEL
      INNER JOIN TGFPAR PAR ON PAR.CODPARC = TEL.CODPARC
      LEFT JOIN TSIEND ENDP ON ENDP.CODEND = PAR.CODEND
      LEFT JOIN TSIBAI BAI ON BAI.CODBAI = PAR.CODBAI
       LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
       LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
       WHERE TRUNC(TEL.DHCHAMADA) = TRUNC(SYSDATE) ${filtroUsuario}
      ORDER BY DECODE(TEL.PENDENTE,'S',0,'N',1), TEL.DHCHAMADA ASC
    `,
    );

    return rows.map((r: any) => ({
      nurel: parseInt(r.NUREL),
      parceiroId: parseInt(r.CODPARC),
      parceiroNome: r.NOMEPARC || '',
      telefone: r.TELEFONE || null,
      email: r.EMAIL || null,
      cnpjCpf: r.CGC_CPF || null,
      razaoSocial: r.RAZAOSOCIAL || null,
      nomeFantasia: null,
      tipoPessoa: r.TIPPESSOA || null,
      pessoFisJur: r.TIPPESSOA || null,
      inscricaoEstadual: r.IDENTINSCESTAD || null,
      logradouro: r.LOGRADOURO || null,
      numeroEnd: r.NUMEND || null,
      complemento: r.COMPLEMENTO || null,
      cep: r.CEP || null,
      bairro: r.BAIRRO || null,
      cidade: r.CIDADE || null,
      uf: r.UF || null,
      pendente: r.PENDENTE === 'S',
      dhchamada: this.parseDate(r.DHCHAMADA),
      dhproxcham: r.DHPROXCHAM ? this.parseDate(r.DHPROXCHAM) : null,
      tipo: r.AD_TIPCHAMADA || r.AD_TIPO || null,
      historico: r.AD_HISTORICO || r.AD_HISTCOBRA || null,
      comentarios: r.COMENTARIOS || null,
      mensagem: r.AD_MSG || null,
      situacao: r.SITUACAO || null,
    }));
  }

  async save(contato: Contato): Promise<Contato> {
    let targetNurel = contato.id;

    // Se NUREL não foi informado ou é 0, busca atendimento pendente para o parceiro
    if (!targetNurel || targetNurel === 0) {
      try {
        const rows = await this.sankhyaGateway.executeQuery(`
          SELECT TEL.NUREL
          FROM TGFTEL TEL
          WHERE TEL.CODPARC = ${contato.parceiroId}
            AND TEL.PENDENTE = 'S'
          ORDER BY TEL.DHCHAMADA DESC
        `);

        if (rows && rows.length > 0 && rows[0].NUREL) {
          targetNurel = parseInt(rows[0].NUREL, 10);
        }
      } catch (err) {
        console.error('[SankhyaContatoRepository] Erro ao buscar NUREL pendente para parceiro:', err);
      }
    }

    if (targetNurel && targetNurel > 0) {
      const comentariosTrunc = (contato.comentarios || contato.mensagem || '').substring(0, 290);
      const msgTrunc = (contato.mensagem || '').substring(0, 290);

      await this.sankhyaGateway.saveRecordTelemarketing(
        { NUREL: targetNurel },
        ['COMENTARIOS', 'AD_MSG', 'DHPROXCHAM', 'PENDENTE', 'SITUACAO'],
        [
          comentariosTrunc,
          msgTrunc,
          contato.proximaChamada ? this.formatDateTime(contato.proximaChamada) : '',
          contato.pendente ? 'S' : 'N',
          contato.pendente ? 'P' : 'C',
        ],
      );
    } else {
      // Se não encontrou NUREL pendente, finaliza qualquer pendência do parceiro via SQL
      try {
        await this.sankhyaGateway.executeQuery(`
          UPDATE TGFTEL
          SET PENDENTE = 'N', SITUACAO = 'C'
          WHERE CODPARC = ${contato.parceiroId}
            AND PENDENTE = 'S'
        `);
      } catch (err) {
        console.error('[SankhyaContatoRepository] Erro ao atualizar pendências do parceiro:', err);
      }
    }

    return contato;
  }

  async updateSituacao(id: number, situacao: SituacaoContato): Promise<void> {
    // Traduz a situação para o campo PENDENTE (S/N):
    //   PENDENTE / EM_ANDAMENTO → 'S' (aguardando retorno)
    //   CONCLUIDO / CANCELADO   → 'N' (não pendente / finalizado)
    const pendente =
      situacao === SituacaoContato.PENDENTE || situacao === SituacaoContato.EM_ANDAMENTO;
    await this.sankhyaGateway.saveRecordTelemarketing(
      { NUREL: id },
      ['PENDENTE'],
      [pendente ? 'S' : 'N'],
    );
  }

  async marcarConcluido(id: number): Promise<void> {
    // Finalizar atendimento: PENDENTE='N' (não pendente), igual à tela nativa
    await this.sankhyaGateway.saveRecordTelemarketing(
      { NUREL: id },
      ['PENDENTE'],
      ['N'],
    );
  }

  async marcarPendente(id: number): Promise<void> {
    // Colocar como pendente: apenas PENDENTE='S' (sim, pendente)
    await this.sankhyaGateway.saveRecordTelemarketing(
      { NUREL: id },
      ['PENDENTE'],
      ['S'],
    );
  }

  private mapQueryToContato(data: any): Contato {
    return Contato.create({
      id: parseInt(data.NUREL),
      parceiroId: parseInt(data.CODPARC),
      parceiroNome: data.NOMEPARC || '',
      dataChamada: this.parseDate(data.DHCHAMADA),
      proximaChamada: data.DHPROXCHAM ? this.parseDate(data.DHPROXCHAM) : null,
      tipo: this.mapTipoFromSankhya(data.AD_TIPCHAMADA || data.AD_TIPO || data.TIPCHAM),
      historico: data.AD_HISTORICO || data.AD_HISTCOBRA || null,
      comentarios: data.COMENTARIOS || null,
      comentarios2: data.COMENTARIOS2 || null,
      mensagem: data.AD_MSG || null,
      pendente: data.PENDENTE === 'S',
      situacao: this.mapSituacaoFromSankhya(data.SITUACAO),
      usuarioId: parseInt(data.CODUSU) || 0,
      usuarioNome: null,
      atendenteId: parseInt(data.CODATENDENTE) || 0,
      atendenteNome: null,
      vendedorId: data.CODVEND ? parseInt(data.CODVEND) : null,
      nuFin: null,
      dataAlteracao: data.DTALTER ? this.parseDate(data.DTALTER) : null,
    });
  }

  private mapTipoFromSankhya(tipo: string | null): TipoContato {
    if (!tipo) return TipoContato.OUTRO;
    const upper = tipo.toUpperCase();
    if (upper.includes('WA') || upper.includes('WHATS')) return TipoContato.WHATSAPP;
    if (upper.includes('TEL')) return TipoContato.TELEFONE;
    if (upper.includes('EMA') || upper.includes('MAIL')) return TipoContato.EMAIL;
    if (upper.includes('BOL')) return TipoContato.BOLETO;
    if (upper.includes('SMS')) return TipoContato.SMS;
    return TipoContato.OUTRO;
  }

  private mapSituacaoFromSankhya(situacao: string | null): SituacaoContato {
    const map: Record<string, SituacaoContato> = {
      'P': SituacaoContato.PENDENTE,
      'A': SituacaoContato.EM_ANDAMENTO,
      'C': SituacaoContato.CONCLUIDO,
      'X': SituacaoContato.CANCELADO,
    };
    return map[situacao || 'P'] || SituacaoContato.PENDENTE;
  }

  private parseDate(dateStr: string | Date | null): Date {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    if (dateStr.includes('/')) {
      const parts = dateStr.split(/[\/ :]/);
      const year = parseInt(parts[2]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[0]);
      const hours = parseInt(parts[3] || '0');
      const minutes = parseInt(parts[4] || '0');
      return new Date(year, month, day, hours, minutes);
    }

    return new Date(dateStr);
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
