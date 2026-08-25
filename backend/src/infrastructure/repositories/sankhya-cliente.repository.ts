import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { SankhyaGateway } from '../sankhya/sankhya.gateway';
import { Cliente, SituacaoCliente, TipoPessoa } from '../../domain/entities/cliente.entity';
import { IClienteRepository, CreateClienteDto, UpdateClienteDto, FindAllClientesResult, ClienteAnexoDto, AnexoArquivoDto, AnexoFonte } from '../../domain/repositories/cliente.repository.interface';

const CLIENTE_SELECT_FIELDS = `
        PAR.CODPARC,
        PAR.NOMEPARC,
        PAR.RAZAOSOCIAL,
        PAR.CGC_CPF,
        PAR.TIPPESSOA,
        PAR.SITUACAO,
        PAR.ATIVO,
        PAR.TELEFONE,
        PAR.EMAIL,
        PAR.IDENTINSCESTAD,
        PAR.PRAZOPAG,
        PAR.LIMCRED,
        PAR.DTCAD,
        PAR.DTALTER,
        PAR.CODEND,
        PAR.NUMEND,
        PAR.COMPLEMENTO,
        PAR.CEP,
        PAR.CODBAI,
        PAR.CODCID,
        PAR.OBSERVACOES,
        PAR.LIMCREDMENSAL,
        PAR.QTDMAXTITVENCIDOS,
        PAR.CODTAB,
        PAR.CODVEND,
        PAR.CODBCO,
        PAR.DESCBONIF,
        PAR.DESCFIN,
        PAR.INSCMUN,
        PAR.CLASSIFICMS,
        PAR.RETEMISS,
        PAR.RETEMINSS,
        PAR.RETEMPIS,
        PAR.RETEMCOFINS,
        PAR.RETEMCSL,
        PAR.AD_CREDCLI,
        PAR.AD_LIMITEPAR,
        PAR.AD_LOCALCAD,
        PAR.AD_CODBCOBOL,
        PAR.AD_DTULTCOMPRA,
        PAR.SIMPLES,
        PAR.PERFILECONECT,
        PAR.TIPOFATUR,
        PAR.REGIMEESPTRIBISS,
        PAR.TIPCLIENTESERVCOM,
        PAR.EMAILNOTIFENTREGA,
        PAR.ENTREGAENDCONTATO,
        PAR.EXIGCONTATOENTCAB,
        PAR.LATITUDE,
        PAR.LONGITUDE,
        PAR.CODTIPPARC,
        PAR.CODREG,
        PAR.GRUPOAUTOR,
        PAR.BLOQUEAR,
        PAR.MOTBLOQ,
        PAR.TIPANEXONFE,
        PAR.EMAILDANFE,
        PAR.EMAILNFE,
        PAR.AD_DTAPROVREP,
        ENDP.NOMEEND AS LOGRADOURO,
        BAI.NOMEBAI AS BAIRRO,
        CID.NOMECID AS CIDADE,
        UFS.UF AS UF,
        BCO.NOMEBCO AS NOMEBCO,
        BCOBOL.NOMEBCO AS NOMEBCOBOL,
        VEN.APELIDO AS NOMEVEND,
        TPP.DESCRTIPPARC AS NOMETIPPARC,
        REG.NOMEREG AS NOMEREG,
        -- Endereço de entrega: dados 100% exclusivos da tabela TGFCPL (Complemento do Parceiro).
        -- Separação completa da TGFCTT (Contatos).
        NULLIF(CPL.CODENDENTREGA, 0) AS CODEND_ENTREGA,
        ENDCPL.NOMEEND AS LOGRADOURO_ENTREGA,
        CPL.NUMENTREGA AS NUMEND_ENTREGA,
        CPL.COMPLENTREGA AS COMPLEMENTO_ENTREGA,
        NULLIF(CPL.CODBAIENTREGA, 0) AS CODBAI_ENTREGA,
        BAICPL.NOMEBAI AS BAIRRO_ENTREGA,
        NULLIF(CPL.CODCIDENTREGA, 0) AS CODCID_ENTREGA,
        CIDCPL.NOMECID AS CIDADE_ENTREGA,
        UFSCPL.UF AS UF_ENTREGA,
        CPL.CEPENTREGA AS CEP_ENTREGA,
        NULL AS CONTATO_ENTREGA,
        CPL.LATITUDEENTREGA AS LATITUDE_ENTREGA,
        CPL.LONGITUDEENTREGA AS LONGITUDE_ENTREGA`;

const CLIENTE_JOINS = `
      LEFT JOIN TSIEND ENDP ON ENDP.CODEND = PAR.CODEND
      LEFT JOIN TSIBAI BAI ON BAI.CODBAI = PAR.CODBAI
      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
      LEFT JOIN TSIBCO BCO ON BCO.CODBCO = PAR.CODBCO
      LEFT JOIN TSIBCO BCOBOL ON BCOBOL.CODBCO = PAR.AD_CODBCOBOL
      LEFT JOIN TGFVEN VEN ON VEN.CODVEND = PAR.CODVEND
      LEFT JOIN TGFTPP TPP ON TPP.CODTIPPARC = PAR.CODTIPPARC
      LEFT JOIN TSIREG REG ON REG.CODREG = PAR.CODREG
      LEFT JOIN TGFCPL CPL ON CPL.CODPARC = PAR.CODPARC
      -- Joins para endereço de entrega via TGFCPL (100% exclusivo)
      LEFT JOIN TSIEND ENDCPL ON ENDCPL.CODEND = NULLIF(CPL.CODENDENTREGA, 0)
      LEFT JOIN TSIBAI BAICPL ON BAICPL.CODBAI = NULLIF(CPL.CODBAIENTREGA, 0)
      LEFT JOIN TSICID CIDCPL ON CIDCPL.CODCID = NULLIF(CPL.CODCIDENTREGA, 0)
      LEFT JOIN TSIUFS UFSCPL ON UFSCPL.CODUF = CIDCPL.UF`;

function formatDateSankhya(d: Date = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
}

@Injectable()
export class SankhyaClienteRepository implements IClienteRepository {
  constructor(private readonly sankhyaGateway: SankhyaGateway) {}

  async findAll(
    filtros?: { nome?: string; cnpjCpf?: string; situacao?: SituacaoCliente; ativo?: 'S' | 'N' },
    page = 1,
    limit = 50,
  ): Promise<FindAllClientesResult> {
    const limitSeguro = Math.min(Math.max(limit, 1), 100);
    const pageSegura = Math.max(page, 1);
    const offset = (pageSegura - 1) * limitSeguro;

    let whereClause = '1=1';

    if (filtros?.nome && filtros.nome.trim()) {
      const nome = filtros.nome.trim().toUpperCase().replace(/'/g, "''");
      const cnpjDig = filtros.nome.replace(/\D/g, '');
      const ouCnpj = cnpjDig.length >= 3 ? ` OR PAR.CGC_CPF LIKE '%${cnpjDig}%'` : '';
      whereClause += ` AND (UPPER(PAR.NOMEPARC) LIKE '%${nome}%' OR UPPER(PAR.RAZAOSOCIAL) LIKE '%${nome}%'${ouCnpj})`;
    }

    if (filtros?.cnpjCpf && filtros.cnpjCpf.trim()) {
      const cnpjCpf = filtros.cnpjCpf.trim().replace(/\D/g, '');
      whereClause += ` AND PAR.CGC_CPF LIKE '%${cnpjCpf}%'`;
    }

    if (filtros?.situacao) {
      const situacoesValidas = Object.values(SituacaoCliente) as string[];
      const situacaoRaw = String(filtros.situacao).trim().toUpperCase();
      if (situacoesValidas.includes(situacaoRaw)) {
        whereClause += ` AND PAR.SITUACAO = '${situacaoRaw}'`;
      }
    }

    if (filtros?.ativo === 'S' || filtros?.ativo === 'N') {
      whereClause += ` AND PAR.ATIVO = '${filtros.ativo}'`;
    }

    const [dataRows, countRows] = await Promise.all([
      this.sankhyaGateway.executeQuery(`
        SELECT * FROM (
          SELECT inner_q.*, ROWNUM AS RN_ FROM (
            SELECT ${CLIENTE_SELECT_FIELDS}
            FROM TGFPAR PAR
            ${CLIENTE_JOINS}
            WHERE ${whereClause}
            ORDER BY PAR.NOMEPARC ASC
          ) inner_q
          WHERE ROWNUM <= ${offset + limitSeguro}
        )
        WHERE RN_ > ${offset}
      `),
      this.sankhyaGateway.executeQuery(`
        SELECT COUNT(*) AS TOTAL
        FROM TGFPAR PAR
        WHERE ${whereClause}
      `),
    ]);

    const total = countRows.length > 0 ? parseInt(countRows[0].TOTAL) || 0 : 0;

    return {
      clientes: dataRows.map(row => this.mapQueryToCliente(row)),
      total,
      page: pageSegura,
      limit: limitSeguro,
      totalPages: Math.ceil(total / limitSeguro) || 1,
    };
  }

  async findById(codParc: number): Promise<Cliente | null> {
    const result = await this.sankhyaGateway.executeQuery(`
      SELECT ${CLIENTE_SELECT_FIELDS}
      FROM TGFPAR PAR
      ${CLIENTE_JOINS}
      WHERE PAR.CODPARC = ${codParc}
        AND ROWNUM <= 1
    `);

    if (result.length === 0) return null;
    return this.mapQueryToCliente(result[0]);
  }

  async findByCnpjCpf(cnpjCpf: string, exato = false): Promise<Cliente[]> {
    const digitos = cnpjCpf.replace(/\D/g, '');
    if (!digitos) return [];

    const condicao = exato
      ? `PAR.CGC_CPF = '${digitos}'`
      : `PAR.CGC_CPF LIKE '%${digitos}%'`;

    const result = await this.sankhyaGateway.executeQuery(`
      SELECT ${CLIENTE_SELECT_FIELDS}
      FROM TGFPAR PAR
      ${CLIENTE_JOINS}
      WHERE ${condicao}
      ORDER BY PAR.NOMEPARC ASC
    `);

    return result.map(row => this.mapQueryToCliente(row));
  }

  async create(dto: CreateClienteDto): Promise<Cliente> {
    const cnpjLimpo = (dto.cnpjCpf || '').replace(/\D/g, '');
    const nome = dto.nomeParc.trim();
    const telefoneDig = (dto.telefone || '').replace(/\D/g, '');

    const campos = [
      'NOMEPARC',
      'RAZAOSOCIAL',
      'CGC_CPF',
      'TIPPESSOA',
      'CLIENTE',
      'ATIVO',
      'TELEFONE',
      'EMAIL',
      'IDENTINSCESTAD',
    ];

    const valores = [
      nome,
      dto.razaoSocial?.trim() || nome,
      cnpjLimpo,
      dto.tipoPessoa,
      'S',
      'S',
      telefoneDig,
      dto.email || '',
      dto.inscricaoEstadual || '',
    ];

    if (dto.prazoPag !== undefined && dto.prazoPag !== null) {
      campos.push('PRAZOPAG');
      valores.push(String(dto.prazoPag));
    }

    if (dto.limiteCredito !== undefined && dto.limiteCredito !== null) {
      campos.push('LIMCRED');
      valores.push(String(dto.limiteCredito));
    }

    if (dto.observacoes !== undefined && dto.observacoes !== null) {
      campos.push('OBSERVACOES');
      valores.push(dto.observacoes);
    }

    if (dto.limiteCreditoMensal !== undefined && dto.limiteCreditoMensal !== null) {
      campos.push('LIMCREDMENSAL');
      valores.push(String(dto.limiteCreditoMensal));
    }
    if (dto.qtdMaxTitVencidos !== undefined && dto.qtdMaxTitVencidos !== null) {
      campos.push('QTDMAXTITVENCIDOS');
      valores.push(String(dto.qtdMaxTitVencidos));
    }
    if (dto.codTab !== undefined && dto.codTab !== null) {
      campos.push('CODTAB');
      valores.push(dto.codTab);
    }
    if (dto.codVend !== undefined && dto.codVend !== null) {
      campos.push('CODVEND');
      valores.push(String(dto.codVend));
    }
    if (dto.codBco !== undefined && dto.codBco !== null) {
      campos.push('CODBCO');
      valores.push(String(dto.codBco));
    }
    if (dto.descBonif !== undefined && dto.descBonif !== null) {
      campos.push('DESCBONIF');
      valores.push(String(dto.descBonif));
    }
    if (dto.descFin !== undefined && dto.descFin !== null) {
      campos.push('DESCFIN');
      valores.push(String(dto.descFin));
    }
    if (dto.inscricaoMunicipal !== undefined && dto.inscricaoMunicipal !== null) {
      campos.push('INSCMUN');
      valores.push(dto.inscricaoMunicipal);
    }
    if (dto.classificacaoIcms !== undefined && dto.classificacaoIcms !== null) {
      campos.push('CLASSIFICMS');
      valores.push(dto.classificacaoIcms);
    }
    if (dto.retemIss !== undefined && dto.retemIss !== null) {
      campos.push('RETEMISS');
      valores.push(dto.retemIss);
    }
    if (dto.retemInss !== undefined && dto.retemInss !== null) {
      campos.push('RETEMINSS');
      valores.push(dto.retemInss);
    }
    if (dto.retemPis !== undefined && dto.retemPis !== null) {
      campos.push('RETEMPIS');
      valores.push(dto.retemPis);
    }
    if (dto.retemCofins !== undefined && dto.retemCofins !== null) {
      campos.push('RETEMCOFINS');
      valores.push(dto.retemCofins);
    }
    if (dto.retemCsl !== undefined && dto.retemCsl !== null) {
      campos.push('RETEMCSL');
      valores.push(dto.retemCsl);
    }
    if (dto.adCredCli !== undefined && dto.adCredCli !== null) {
      campos.push('AD_CREDCLI');
      valores.push(String(dto.adCredCli));
    }
    if (dto.adLimitePar !== undefined && dto.adLimitePar !== null) {
      campos.push('AD_LIMITEPAR');
      valores.push(String(dto.adLimitePar));
    }
    if (dto.adLocalCad !== undefined && dto.adLocalCad !== null) {
      campos.push('AD_LOCALCAD');
      valores.push(dto.adLocalCad);
    }
    if (dto.adCodBcoBol !== undefined && dto.adCodBcoBol !== null) {
      campos.push('AD_CODBCOBOL');
      valores.push(String(dto.adCodBcoBol));
    }
    if (dto.simples !== undefined && dto.simples !== null) {
      campos.push('SIMPLES');
      valores.push(dto.simples);
    }
    if (dto.perfilEconect !== undefined && dto.perfilEconect !== null) {
      campos.push('PERFILECONECT');
      valores.push(dto.perfilEconect);
    }
    if (dto.tipoFatur !== undefined && dto.tipoFatur !== null) {
      campos.push('TIPOFATUR');
      valores.push(dto.tipoFatur);
    }
    if (dto.regimeEspTribIss !== undefined && dto.regimeEspTribIss !== null) {
      campos.push('REGIMEESPTRIBISS');
      valores.push(dto.regimeEspTribIss);
    }
    if (dto.tipoClienteServCom !== undefined && dto.tipoClienteServCom !== null) {
      campos.push('TIPCLIENTESERVCOM');
      valores.push(dto.tipoClienteServCom);
    }
    if (dto.emailNotifEntrega !== undefined && dto.emailNotifEntrega !== null) {
      campos.push('EMAILNOTIFENTREGA');
      valores.push(dto.emailNotifEntrega);
    }
    if (dto.entregaEndContato !== undefined && dto.entregaEndContato !== null) {
      campos.push('ENTREGAENDCONTATO');
      valores.push(dto.entregaEndContato);
    }
    if (dto.exigContatoEntCab !== undefined && dto.exigContatoEntCab !== null) {
      campos.push('EXIGCONTATOENTCAB');
      valores.push(dto.exigContatoEntCab);
    }

    await this.aplicarEndereco(campos, valores, dto.endereco);

    // CODCID é NOT NULL + trigger TRG_INC_TGFPAR exige > 0 (validado em runtime)
    if (!campos.includes('CODCID')) {
      throw new Error('Cidade é obrigatória para cadastrar parceiro (CODCID não resolvido)');
    }

    // CODBAI/CODEND são NOT NULL mas aceitam 0
    for (const fk of ['CODBAI', 'CODEND']) {
      if (!campos.includes(fk)) {
        campos.push(fk);
        valores.push('0');
      }
    }

    // Insert no DatasetSP.save exige pk com o campo-chave vazio
    await this.sankhyaGateway.saveRecord('Parceiro', { CODPARC: '' }, campos, valores);

    const nomeEscapado = nome.toUpperCase().replace(/'/g, "''");
    const result = await this.sankhyaGateway.executeQuery(`
      SELECT ${CLIENTE_SELECT_FIELDS}
      FROM TGFPAR PAR
      ${CLIENTE_JOINS}
      WHERE PAR.CGC_CPF = '${cnpjLimpo}'
        AND UPPER(PAR.NOMEPARC) = '${nomeEscapado}'
      ORDER BY PAR.CODPARC DESC
    `);

    if (result.length === 0) {
      throw new Error('Falha ao recuperar cliente criado');
    }

    return this.mapQueryToCliente(result[0]);
  }

  async update(codParc: number, dto: UpdateClienteDto): Promise<Cliente> {
    const campos: string[] = [];
    const valores: string[] = [];

    if (dto.nomeParc != null) {
      campos.push('NOMEPARC');
      valores.push(dto.nomeParc.trim());
    }

    if (dto.razaoSocial != null) {
      campos.push('RAZAOSOCIAL');
      valores.push(dto.razaoSocial.trim());
    }

    if (dto.cnpjCpf != null) {
      campos.push('CGC_CPF');
      valores.push(dto.cnpjCpf.replace(/\D/g, ''));
    }

    if (dto.tipoPessoa != null) {
      campos.push('TIPPESSOA');
      valores.push(dto.tipoPessoa);
    }

    if (dto.situacao != null) {
      campos.push('SITUACAO');
      valores.push(dto.situacao);
    }

    if (dto.telefone != null) {
      campos.push('TELEFONE');
      valores.push(dto.telefone.replace(/\D/g, ''));
    }

    if (dto.email != null) {
      campos.push('EMAIL');
      valores.push(dto.email);
    }

    if (dto.inscricaoEstadual != null) {
      campos.push('IDENTINSCESTAD');
      valores.push(dto.inscricaoEstadual);
    }

    if (dto.prazoPag != null) {
      campos.push('PRAZOPAG');
      valores.push(String(dto.prazoPag));
    }

    if (dto.limiteCredito != null) {
      campos.push('LIMCRED');
      valores.push(String(dto.limiteCredito));
    }

    if (dto.observacoes != null) {
      campos.push('OBSERVACOES');
      valores.push(dto.observacoes);
    }
    if (dto.limiteCreditoMensal != null) {
      campos.push('LIMCREDMENSAL');
      valores.push(String(dto.limiteCreditoMensal));
    }
    if (dto.qtdMaxTitVencidos != null) {
      campos.push('QTDMAXTITVENCIDOS');
      valores.push(String(dto.qtdMaxTitVencidos));
    }
    if (dto.codTab != null) {
      campos.push('CODTAB');
      valores.push(dto.codTab);
    }
    if (dto.codVend != null) {
      campos.push('CODVEND');
      valores.push(String(dto.codVend));
    }
    if (dto.codBco != null) {
      campos.push('CODBCO');
      valores.push(String(dto.codBco));
    }
    if (dto.descBonif != null) {
      campos.push('DESCBONIF');
      valores.push(String(dto.descBonif));
    }
    if (dto.descFin != null) {
      campos.push('DESCFIN');
      valores.push(String(dto.descFin));
    }
    if (dto.inscricaoMunicipal != null) {
      campos.push('INSCMUN');
      valores.push(dto.inscricaoMunicipal);
    }
    if (dto.classificacaoIcms != null) {
      campos.push('CLASSIFICMS');
      valores.push(dto.classificacaoIcms);
    }
    if (dto.retemIss != null) {
      campos.push('RETEMISS');
      valores.push(dto.retemIss);
    }
    if (dto.retemInss != null) {
      campos.push('RETEMINSS');
      valores.push(dto.retemInss);
    }
    if (dto.retemPis != null) {
      campos.push('RETEMPIS');
      valores.push(dto.retemPis);
    }
    if (dto.retemCofins != null) {
      campos.push('RETEMCOFINS');
      valores.push(dto.retemCofins);
    }
    if (dto.retemCsl != null) {
      campos.push('RETEMCSL');
      valores.push(dto.retemCsl);
    }
    if (dto.adCredCli != null) {
      campos.push('AD_CREDCLI');
      valores.push(String(dto.adCredCli));
    }
    if (dto.adLimitePar != null) {
      campos.push('AD_LIMITEPAR');
      valores.push(String(dto.adLimitePar));
    }
    if (dto.adLocalCad != null) {
      campos.push('AD_LOCALCAD');
      valores.push(dto.adLocalCad);
    }
    if (dto.adCodBcoBol != null) {
      campos.push('AD_CODBCOBOL');
      valores.push(String(dto.adCodBcoBol));
    }
    if (dto.simples != null) {
      campos.push('SIMPLES');
      valores.push(dto.simples);
    }
    if (dto.perfilEconect != null) {
      campos.push('PERFILECONECT');
      valores.push(dto.perfilEconect);
    }
    if (dto.tipoFatur != null) {
      campos.push('TIPOFATUR');
      valores.push(dto.tipoFatur);
    }
    if (dto.regimeEspTribIss != null) {
      campos.push('REGIMEESPTRIBISS');
      valores.push(dto.regimeEspTribIss);
    }
    if (dto.tipoClienteServCom != null) {
      campos.push('TIPCLIENTESERVCOM');
      valores.push(dto.tipoClienteServCom);
    }
    if (dto.emailNotifEntrega != null) {
      campos.push('EMAILNOTIFENTREGA');
      valores.push(dto.emailNotifEntrega);
    }
    if (dto.entregaEndContato != null) {
      campos.push('ENTREGAENDCONTATO');
      valores.push(dto.entregaEndContato);
    }
    if (dto.exigContatoEntCab != null) {
      campos.push('EXIGCONTATOENTCAB');
      valores.push(dto.exigContatoEntCab);
    }
    if (dto.ativo != null) {
      campos.push('ATIVO');
      valores.push(dto.ativo);
    }
    if (dto.codTipParc != null) {
      campos.push('CODTIPPARC');
      valores.push(String(dto.codTipParc));
    }
    if (dto.codReg != null) {
      campos.push('CODREG');
      valores.push(String(dto.codReg));
    }
    if (dto.dtCad != null) {
      campos.push('DTCAD');
      valores.push(dto.dtCad);
    }
    if (dto.grupoAutor != null) {
      campos.push('GRUPOAUTOR');
      valores.push(String(dto.grupoAutor));
    }
    if (dto.bloquear != null) {
      campos.push('BLOQUEAR');
      valores.push(dto.bloquear);
    }
    if (dto.motBloq != null) {
      campos.push('MOTBLOQ');
      valores.push(dto.motBloq);
    }
    if (dto.tipAnexoNfe != null) {
      campos.push('TIPANEXONFE');
      valores.push(dto.tipAnexoNfe);
    }
    if (dto.emailDanfe != null) {
      campos.push('EMAILDANFE');
      valores.push(dto.emailDanfe);
    }
    if (dto.emailNfe != null) {
      campos.push('EMAILNFE');
      valores.push(dto.emailNfe);
    }
    if (dto.adDtAprovRep != null) {
      campos.push('AD_DTAPROVREP');
      valores.push(dto.adDtAprovRep);
    }

    // GPS (LATITUDE/LONGITUDE) em save SEPARADO: em payloads grandes o
    // DatasetSP.save já retornou estes campos vazios sem erro (comportamento
    // transiente observado em teste real); save isolado aplica sempre.
    const gpsCampos: string[] = [];
    const gpsValores: string[] = [];
    if (dto.latitude !== undefined && dto.latitude !== null) {
      gpsCampos.push('LATITUDE');
      gpsValores.push(dto.latitude);
    }
    if (dto.longitude !== undefined && dto.longitude !== null) {
      gpsCampos.push('LONGITUDE');
      gpsValores.push(dto.longitude);
    }

    // Atualiza sempre DTALTER na TGFPAR com a data/hora atual da alteracao
    campos.push('DTALTER');
    valores.push(formatDateSankhya());

    if (dto.endereco != null) {
      await this.aplicarEndereco(campos, valores, dto.endereco);
    }

    if (campos.length > 0) {
      await this.sankhyaGateway.saveRecord('Parceiro', { CODPARC: codParc }, campos, valores);
    }

    if (gpsCampos.length > 0) {
      await this.sankhyaGateway.saveRecord('Parceiro', { CODPARC: codParc }, gpsCampos, gpsValores);
    }

    if (dto.enderecoEntrega) {
      const entE = dto.enderecoEntrega;
      let codEnd = entE.codEnd || 0;
      let codBai = entE.codBai || 0;
      let codCid = entE.codCid || 0;

      const cidLimpa = entE.cidade?.replace(/\s*\([^)]*\)\s*$/, '').trim();

      // Resolve FKs no banco Sankhya via resolverEnderecoFks (match exato / aproximado inteligente)
      const resolvedFks = await this.resolverEnderecoFks({
        logradouro: entE.logradouro,
        bairro: entE.bairro,
        cidade: cidLimpa,
        uf: entE.uf,
      });

      if (!codCid && resolvedFks.CODCID) codCid = resolvedFks.CODCID;
      if (!codBai && resolvedFks.CODBAI) codBai = resolvedFks.CODBAI;
      if (!codEnd && resolvedFks.CODEND) codEnd = resolvedFks.CODEND;

      // Preserva o valor atual do CPL se não resolvido
      if (!codEnd || !codBai || !codCid) {
        try {
          const atual = await this.sankhyaGateway.executeQuery(`
            SELECT CODENDENTREGA, CODBAIENTREGA, CODCIDENTREGA FROM TGFCPL
            WHERE CODPARC = ${codParc}`);
          const cur = atual[0];
          if (cur) {
            if (!codEnd && cur.CODENDENTREGA) codEnd = parseInt(cur.CODENDENTREGA);
            if (!codBai && cur.CODBAIENTREGA) codBai = parseInt(cur.CODBAIENTREGA);
            if (!codCid && cur.CODCIDENTREGA) codCid = parseInt(cur.CODCIDENTREGA);
          }
        } catch { /* ignora */ }
      }

      const cplCampos: string[] = [];
      const cplValores: string[] = [];

      if (codEnd > 0) { cplCampos.push('ComplementoParc.CODENDENTREGA'); cplValores.push(String(codEnd)); }
      if (codBai > 0) { cplCampos.push('ComplementoParc.CODBAIENTREGA'); cplValores.push(String(codBai)); }
      if (codCid > 0) { cplCampos.push('ComplementoParc.CODCIDENTREGA'); cplValores.push(String(codCid)); }
      if (entE.numero != null) { cplCampos.push('ComplementoParc.NUMENTREGA'); cplValores.push(entE.numero.trim().substring(0, 6)); }
      if (entE.complemento != null) { cplCampos.push('ComplementoParc.COMPLENTREGA'); cplValores.push(entE.complemento.trim().substring(0, 30)); }
      if (entE.cep != null) { cplCampos.push('ComplementoParc.CEPENTREGA'); cplValores.push(entE.cep.replace(/\D/g, '')); }
      if (dto.latitudeEntrega != null) { cplCampos.push('ComplementoParc.LATITUDEENTREGA'); cplValores.push(dto.latitudeEntrega.trim()); }
      if (dto.longitudeEntrega != null) { cplCampos.push('ComplementoParc.LONGITUDEENTREGA'); cplValores.push(dto.longitudeEntrega.trim()); }

      if (cplCampos.length > 0) {
        cplCampos.unshift('ComplementoParc.DTALTER');
        cplValores.unshift(formatDateSankhya());
        try {
          await this.sankhyaGateway.saveRecord(
            'Parceiro',
            { CODPARC: codParc },
            cplCampos,
            cplValores,
          );
        } catch (err) {
          console.error('[SankhyaRepository] Erro ao salvar ComplementoParc (TGFCPL) via DatasetSP.save:', err);
        }
      }
    } else if (dto.latitudeEntrega != null || dto.longitudeEntrega != null) {
      const cplCampos: string[] = ['ComplementoParc.DTALTER'];
      const cplValores: string[] = [formatDateSankhya()];
      if (dto.latitudeEntrega != null) { cplCampos.push('ComplementoParc.LATITUDEENTREGA'); cplValores.push(dto.latitudeEntrega.trim()); }
      if (dto.longitudeEntrega != null) { cplCampos.push('ComplementoParc.LONGITUDEENTREGA'); cplValores.push(dto.longitudeEntrega.trim()); }
      try {
        await this.sankhyaGateway.saveRecord(
          'Parceiro',
          { CODPARC: codParc },
          cplCampos,
          cplValores,
        );
      } catch (err) {
        console.error('[SankhyaRepository] Erro ao salvar LATITUDEENTREGA/LONGITUDEENTREGA (TGFCPL):', err);
      }
    }

    const atualizado = await this.findById(codParc);
    if (!atualizado) {
      throw new Error('Falha ao recuperar cliente atualizado');
    }

    return atualizado;
  }

  async delete(codParc: number): Promise<void> {
    // Inativação = ATIVO='N'. SITUACAO é classificação de crédito (P/R/B/O/E), não status.
    await this.sankhyaGateway.saveRecord('Parceiro', { CODPARC: codParc }, ['ATIVO'], ['N']);
  }

  async count(): Promise<number> {
    const result = await this.sankhyaGateway.executeQuery(`
      SELECT COUNT(*) AS TOTAL FROM TGFPAR
    `);

    return parseInt(result[0].TOTAL) || 0;
  }

  async validarDocumentoExistente(cgcCpf: string, codParc?: number): Promise<{ existe: boolean; mensagem?: string }> {
    const cleaned = (cgcCpf || '').replace(/\D/g, '');
    if (!cleaned) return { existe: false };

    try {
      const response = await this.sankhyaGateway.serviceCall(
        'ParceiroSP.verificaExistenciaCpfInscEstRepetido',
        {
          serviceName: 'ParceiroSP.verificaExistenciaCpfInscEstRepetido',
          requestBody: {
            param: {
              codParc: codParc ? String(codParc) : '',
              cgcCpf: cleaned,
            },
            clientEventList: {
              clientEvent: [
                { $: 'parceiro.mostra.mensagem.criticaie' },
                { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
              ],
            },
          },
        },
        'mgebase',
      );

      const responseBody = response?.responseBody;
      const existeNoResponse = responseBody?.existe === 'true' || responseBody?.existe === true;
      const msg = responseBody?.mensagem || responseBody?.param?.mensagem;

      if (existeNoResponse || msg) {
        return {
          existe: true,
          mensagem: msg || 'CNPJ/CPF já cadastrado no Sankhya.',
        };
      }
    } catch {
      // Fallback para verificação SQL
    }

    const existentes = await this.findByCnpjCpf(cleaned, true);
    const filtrados = codParc ? existentes.filter(c => c.codParc !== codParc) : existentes;

    if (filtrados.length > 0) {
      return {
        existe: true,
        mensagem: `CNPJ/CPF já cadastrado para o parceiro ${filtrados[0].nomeParc} (#${filtrados[0].codParc}).`,
      };
    }

    return { existe: false };
  }

  /**
   * Endereço no TGFPAR é composto por FKs (CODEND/TSIEND, CODBAI/TSIBAI,
   * CODCID/TSICID) + colunas diretas (NUMEND, COMPLEMENTO, CEP).
   * FKs: usa código direto quando informado; senão tenta resolver por nome
   * (match exato case-insensitive). Nome não encontrado = FK ignorada.
   */
  private async aplicarEndereco(campos: string[], valores: string[], endereco?: {
    codEnd?: number;
    codBai?: number;
    codCid?: number;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  }): Promise<void> {
    if (!endereco) return;

    if (endereco.numero != null && endereco.numero.trim()) {
      campos.push('NUMEND');
      valores.push(endereco.numero.trim().substring(0, 6));
    }

    if (endereco.complemento != null && endereco.complemento.trim()) {
      campos.push('COMPLEMENTO');
      valores.push(endereco.complemento.trim().substring(0, 30));
    }

    if (endereco.cep != null && endereco.cep.trim()) {
      campos.push('CEP');
      valores.push(endereco.cep.replace(/\D/g, ''));
    }

    if (endereco.codCid && endereco.codCid > 0) {
      campos.push('CODCID');
      valores.push(String(endereco.codCid));
    } else if (endereco.cidade?.trim()) {
      const fks = await this.resolverEnderecoFks({ cidade: endereco.cidade, uf: endereco.uf });
      if (fks.CODCID) {
        campos.push('CODCID');
        valores.push(String(fks.CODCID));
      }
    }

    if (endereco.codBai && endereco.codBai > 0) {
      campos.push('CODBAI');
      valores.push(String(endereco.codBai));
    } else if (endereco.bairro?.trim()) {
      const fks = await this.resolverEnderecoFks({ bairro: endereco.bairro });
      if (fks.CODBAI) {
        campos.push('CODBAI');
        valores.push(String(fks.CODBAI));
      }
    }

    if (endereco.codEnd && endereco.codEnd > 0) {
      campos.push('CODEND');
      valores.push(String(endereco.codEnd));
    } else if (endereco.logradouro?.trim()) {
      const fks = await this.resolverEnderecoFks({ logradouro: endereco.logradouro });
      if (fks.CODEND) {
        campos.push('CODEND');
        valores.push(String(fks.CODEND));
      }
    }
  }

  private async resolverEnderecoFks(endereco?: {
    logradouro?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  }): Promise<{ CODEND?: number; CODBAI?: number; CODCID?: number }> {
    const fks: { CODEND?: number; CODBAI?: number; CODCID?: number } = {};
    if (!endereco) return fks;

    const esc = (v: string) => v.trim().toUpperCase().replace(/'/g, "''");
    // Normalizacao de acentos nos dois lados (ex.: 'JOAO PESSOA' = 'JOÃO PESSOA')
    const SEM_ACENTO = `TRANSLATE(%s, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC')`;
    const nomeNorm = (v: string) => esc(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    try {
      if (endereco.cidade?.trim()) {
        const cidLimpa = endereco.cidade.replace(/\s*\([^)]*\)\s*$/, '').trim();
        const ufCond = endereco.uf?.trim() ? `AND UFS.UF = '${esc(endereco.uf)}'` : '';
        let rows = await this.sankhyaGateway.executeQuery(`
          SELECT CID.CODCID FROM TSICID CID
          JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
          WHERE ${SEM_ACENTO.replace('%s', 'CID.NOMECID')} = '${nomeNorm(cidLimpa)}' ${ufCond}
            AND ROWNUM <= 1
        `);
        if (rows.length === 0 && ufCond) {
          rows = await this.sankhyaGateway.executeQuery(`
            SELECT CID.CODCID FROM TSICID CID
            WHERE ${SEM_ACENTO.replace('%s', 'CID.NOMECID')} = '${nomeNorm(cidLimpa)}'
              AND ROWNUM <= 1
          `);
        }
        if (rows.length > 0) fks.CODCID = parseInt(rows[0].CODCID);
      }

      if (endereco.bairro?.trim()) {
        const norm = nomeNorm(endereco.bairro);
        let rows = await this.sankhyaGateway.executeQuery(`
          SELECT BAI.CODBAI FROM TSIBAI BAI
          WHERE ${SEM_ACENTO.replace('%s', 'BAI.NOMEBAI')} = '${norm}'
            AND ROWNUM <= 1
        `);
        if (rows.length === 0 && norm.length >= 3) {
          rows = await this.sankhyaGateway.executeQuery(`
            SELECT BAI.CODBAI FROM TSIBAI BAI
            WHERE ${SEM_ACENTO.replace('%s', 'BAI.NOMEBAI')} LIKE '%${norm}%'
              AND ROWNUM <= 1
          `);
        }
        if (rows.length > 0) fks.CODBAI = parseInt(rows[0].CODBAI);
      }

      if (endereco.logradouro?.trim()) {
        const norm = nomeNorm(endereco.logradouro);
        let rows = await this.sankhyaGateway.executeQuery(`
          SELECT END$.CODEND FROM TSIEND END$
          WHERE ${SEM_ACENTO.replace('%s', 'END$.NOMEEND')} = '${norm}'
            AND ROWNUM <= 1
        `);
        if (rows.length === 0) {
          const semTipo = norm.replace(/^(RUA|AVENIDA|AV|TRAVESSA|ALAMEDA|PRACA|PCA)\s+/, '').trim();
          if (semTipo.length >= 3) {
            rows = await this.sankhyaGateway.executeQuery(`
              SELECT END$.CODEND FROM TSIEND END$
              WHERE ${SEM_ACENTO.replace('%s', 'END$.NOMEEND')} LIKE '%${semTipo}%'
                AND ROWNUM <= 1
            `);
          }
        }
        if (rows.length > 0) fks.CODEND = parseInt(rows[0].CODEND);
      }
    } catch (error) {
      console.warn('[SankhyaClienteRepository] Falha ao resolver FKs de endereço (ignorado):', (error as any)?.message);
    }

    return fks;
  }

  async buscarCidades(query: string): Promise<Array<{ codCid: number; nomeCidade: string; uf: string }>> {
    const q = query.trim().toUpperCase().replace(/'/g, "''");
    const filtro = q ? `AND UPPER(CID.NOMECID) LIKE '%${q}%'` : '';
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT * FROM (
        SELECT CID.CODCID, CID.NOMECID, UFS.UF
        FROM TSICID CID
        JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
        WHERE CID.CODCID > 0
          AND CID.NOMECID NOT LIKE '<%'
          ${filtro}
        ORDER BY CID.NOMECID ASC
      ) WHERE ROWNUM <= 20
    `);

    return rows.map(r => ({ codCid: parseInt(r.CODCID), nomeCidade: r.NOMECID || '', uf: r.UF || '' }));
  }

  async buscarBairros(query: string): Promise<Array<{ codBai: number; nomeBairro: string }>> {
    const q = query.trim().toUpperCase().replace(/'/g, "''");
    const filtro = q ? `AND UPPER(BAI.NOMEBAI) LIKE '%${q}%'` : '';
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT * FROM (
        SELECT BAI.CODBAI, BAI.NOMEBAI
        FROM TSIBAI BAI
        WHERE BAI.CODBAI > 0
          AND BAI.NOMEBAI NOT LIKE '<%'
          ${filtro}
        ORDER BY BAI.NOMEBAI ASC
      ) WHERE ROWNUM <= 20
    `);

    return rows.map(r => ({ codBai: parseInt(r.CODBAI), nomeBairro: r.NOMEBAI || '' }));
  }

  async buscarLogradouros(query: string): Promise<Array<{ codEnd: number; nomeEnd: string }>> {
    const q = query.trim().toUpperCase().replace(/'/g, "''");
    const filtro = q ? `AND UPPER(ENDP.NOMEEND) LIKE '%${q}%'` : '';
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT * FROM (
        SELECT ENDP.CODEND, ENDP.NOMEEND
        FROM TSIEND ENDP
        WHERE ENDP.CODEND > 0
          AND ENDP.NOMEEND NOT LIKE '<%'
          ${filtro}
        ORDER BY ENDP.NOMEEND ASC
      ) WHERE ROWNUM <= 20
    `);

    return rows.map(r => ({ codEnd: parseInt(r.CODEND), nomeEnd: r.NOMEEND || '' }));
  }

  async buscarBancos(query: string): Promise<Array<{ codBco: number; nomeBco: string }>> {
    const q = query.trim().toUpperCase().replace(/'/g, "''");
    const filtro = q ? `AND (UPPER(BCO.NOMEBCO) LIKE '%${q}%' OR CAST(BCO.CODBCO AS VARCHAR2(20)) LIKE '%${q}%')` : '';
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT * FROM (
        SELECT BCO.CODBCO, BCO.NOMEBCO
        FROM TSIBCO BCO
        WHERE BCO.CODBCO >= 0
          ${filtro}
        ORDER BY BCO.NOMEBCO ASC
      ) WHERE ROWNUM <= 40
    `);

    return rows.map(r => ({ codBco: parseInt(r.CODBCO), nomeBco: r.NOMEBCO || '' }));
  }

  async buscarTiposParceiro(query: string): Promise<Array<{ codTipParc: number; nomeTipParc: string }>> {
    const q = query.trim().toUpperCase().replace(/'/g, "''");
    const filtro = q ? `WHERE (UPPER(TPP.DESCRTIPPARC) LIKE '%${q}%' OR CAST(TPP.CODTIPPARC AS VARCHAR2(20)) LIKE '%${q}%')` : '';
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT * FROM (
        SELECT TPP.CODTIPPARC, TPP.DESCRTIPPARC
        FROM TGFTPP TPP
        ${filtro}
        ORDER BY TPP.CODTIPPARC ASC
      ) WHERE ROWNUM <= 40
    `);

    return rows.map(r => ({ codTipParc: parseInt(r.CODTIPPARC), nomeTipParc: r.DESCRTIPPARC || '' }));
  }

  async buscarRegioes(query: string): Promise<Array<{ codReg: number; nomeReg: string }>> {
    const q = query.trim().toUpperCase().replace(/'/g, "''");
    const filtro = q ? `WHERE (UPPER(REG.NOMEREG) LIKE '%${q}%' OR CAST(REG.CODREG AS VARCHAR2(20)) LIKE '%${q}%')` : '';
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT * FROM (
        SELECT REG.CODREG, REG.NOMEREG
        FROM TSIREG REG
        ${filtro}
        ORDER BY REG.CODREG ASC
      ) WHERE ROWNUM <= 40
    `);

    return rows.map(r => ({ codReg: parseInt(r.CODREG), nomeReg: r.NOMEREG || '' }));
  }

  async buscarCep(cep: string): Promise<{
    encontradoNoSankhya: boolean;
    cep: string;
    logradouro?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    codEnd?: number;
    codBai?: number;
    codCid?: number;
  } | null> {
    const cleanCep = (cep || '').replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
      const rows = await this.sankhyaGateway.executeQuery(`
        SELECT
          CEP.CEP,
          CEP.CODEND, END$.NOMEEND AS LOGRADOURO,
          CEP.CODBAI, BAI.NOMEBAI AS BAIRRO,
          CEP.CODCID, CID.NOMECID AS CIDADE, UFS.UF
        FROM TSICEP CEP
        LEFT JOIN TSIEND END$ ON END$.CODEND = CEP.CODEND
        LEFT JOIN TSIBAI BAI ON BAI.CODBAI = CEP.CODBAI
        LEFT JOIN TSICID CID ON CID.CODCID = CEP.CODCID
        LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
        WHERE CEP.CEP = '${cleanCep}'
          AND ROWNUM <= 1
      `);

      if (rows.length > 0 && rows[0].CODCID) {
        const r = rows[0];
        return {
          encontradoNoSankhya: true,
          cep: cleanCep,
          logradouro: r.LOGRADOURO || undefined,
          bairro: r.BAIRRO || undefined,
          cidade: r.CIDADE || undefined,
          uf: r.UF || undefined,
          codEnd: parseInt(r.CODEND) || undefined,
          codBai: parseInt(r.CODBAI) || undefined,
          codCid: parseInt(r.CODCID) || undefined,
        };
      }
    } catch (e) {
      console.warn('[SankhyaRepository] Erro ao consultar TSICEP no Sankhya:', e);
    }

    return null;
  }

  async buscarEmpresasParceiro(codParc: number): Promise<Array<{ codParc: number; codEmp: number; nomeEmp?: string; codTab?: number; nomeTab?: string; classificIcms?: string }>> {
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT PAEM.CODPARC, PAEM.CODEMP, PAEM.CODTAB, TAB.NOMETAB, EMP.NOMEFANTASIA AS NOMEEMP,
             PAEM.CLASSIFICMS
      FROM TGFPAEM PAEM
      INNER JOIN TSIEMP EMP ON EMP.CODEMP = PAEM.CODEMP
      LEFT JOIN VGFTAB TAB ON TAB.CODTAB = PAEM.CODTAB
      WHERE PAEM.CODPARC = ${codParc}
      ORDER BY PAEM.CODEMP ASC
    `);

    return rows.map(r => ({
      codParc: parseInt(r.CODPARC, 10),
      codEmp: parseInt(r.CODEMP, 10),
      nomeEmp: r.NOMEEMP || undefined,
      codTab: r.CODTAB != null ? parseInt(r.CODTAB, 10) : undefined,
      nomeTab: r.NOMETAB ? `${r.CODTAB} - ${r.NOMETAB}` : (r.CODTAB != null ? `Tabela #${r.CODTAB}` : undefined),
      classificIcms: r.CLASSIFICMS || undefined,
    }));
  }

  async buscarListaEmpresas(): Promise<Array<{ codEmp: number; nomeEmp: string }>> {
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT CODEMP, NOMEFANTASIA, RAZAOSOCIAL
      FROM TSIEMP
      ORDER BY CODEMP ASC
    `);

    return rows.map(r => ({
      codEmp: parseInt(r.CODEMP, 10),
      nomeEmp: `${r.CODEMP} - ${r.NOMEFANTASIA || r.RAZAOSOCIAL || ''}`,
    }));
  }

  async buscarListaTabelasPreco(): Promise<Array<{ codTab: number; nomeTab: string }>> {
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT CODTAB, NOMETAB
      FROM VGFTAB
      ORDER BY CODTAB ASC
    `);

    return rows.map(r => {
      const c = parseInt(r.CODTAB, 10);
      const desc = r.NOMETAB || `Tabela #${c}`;
      return {
        codTab: c,
        nomeTab: `${c} - ${desc}`,
      };
    });
  }

  async salvarEmpresaParceiro(
    codParc: number,
    codEmp: number,
    codTab?: number,
    classificIcms?: string,
  ): Promise<void> {
    const fields = ['CODPARC', 'CODEMP'];
    const values = [String(codParc), String(codEmp)];

    if (codTab !== undefined) {
      fields.push('CODTAB');
      values.push(String(codTab));
    }
    if (classificIcms !== undefined) {
      fields.push('CLASSIFICMS');
      values.push(classificIcms);
    }

    await this.sankhyaGateway.saveRecord(
      'ParceiroEmpresGrupoIcms',
      { CODPARC: String(codParc), CODEMP: String(codEmp) },
      fields,
      values,
    );
  }

  async removerEmpresaParceiro(codParc: number, codEmp: number): Promise<void> {
    await this.sankhyaGateway.serviceCall('DatasetSP.removeRecord', {
      serviceName: 'DatasetSP.removeRecord',
      requestBody: {
        dataSetID: '052',
        entityName: 'ParceiroEmpresGrupoIcms',
        standAlone: false,
        pks: [{ CODEMP: String(codEmp), CODPARC: String(codParc) }],
        ignoreListenerMethods: '',
      },
    });
  }

  async buscarAnexosParceiro(codParc: number): Promise<ClienteAnexoDto[]> {
    const resultados: ClienteAnexoDto[] = [];

    // TSIATA — arquivos inseridos pela tela nativa do Sankhya (BLOB no Oracle)
    try {
      const tsiataRows = await this.sankhyaGateway.executeQuery(`
        SELECT CODATA, SEQUENCIA, DESCRICAO, ARQUIVO, TIPOCONTEUDO,
               DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO,
               TO_CHAR(DTALTER, 'DD/MM/YYYY HH24:MI:SS') AS DTALTER
        FROM TSIATA
        WHERE TIPO = 'P' AND CODATA = ${codParc}
        ORDER BY SEQUENCIA
      `);
      for (const r of (tsiataRows || [])) {
        resultados.push({
          nuAttach: parseInt(r.SEQUENCIA, 10),
          fonte: 'TSIATA',
          nomeArquivo: r.ARQUIVO || r.DESCRICAO || `anexo_seq${r.SEQUENCIA}`,
          descricao: r.DESCRICAO || '',
          dataCadastro: r.DTALTER || '',
          tipoAcesso: 'ALL',
          tipoApres: r.TIPOCONTEUDO === 'N' ? 'DB' : 'LOC',
          tamanhoBytes: r.TAMANHO ? parseInt(r.TAMANHO, 10) : 0,
        });
      }
    } catch (e: any) {
      console.warn('[buscarAnexosParceiro] Erro ao consultar TSIATA:', e?.message);
    }

    return resultados;
  }

  private getUploadDir(): string {
    const uploadDir = path.join(process.cwd(), 'uploads', 'anexos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
  }

  private salvarArquivoLocal(codParc: number, nuAttach: number, nomeArquivo: string, content: Buffer, contentType: string): void {
    try {
      const dir = this.getUploadDir();
      const filename = `${codParc}_${nuAttach}_${nomeArquivo.replace(/[\\/:*?"<>|]/g, '_')}`;
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, content);

      const metaPath = path.join(dir, `${codParc}_${nuAttach}.json`);
      fs.writeFileSync(metaPath, JSON.stringify({ contentType, nomeArquivo, filename }));
    } catch (e: any) {
      console.warn('[salvarArquivoLocal] Erro ao salvar cópia local:', e?.message);
    }
  }

  private buscarArquivoLocal(codParc: number, nuAttach: number, nomeOriginal?: string): AnexoArquivoDto | null {
    try {
      const dir = this.getUploadDir();
      const metaPath = path.join(dir, `${codParc}_${nuAttach}.json`);
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const filePath = path.join(dir, meta.filename);
        if (fs.existsSync(filePath)) {
          return {
            buffer: fs.readFileSync(filePath),
            contentType: meta.contentType || 'application/octet-stream',
            nomeArquivo: meta.nomeArquivo || nomeOriginal || `anexo_${nuAttach}`,
          };
        }
      }

      const prefix = `${codParc}_${nuAttach}_`;
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const match = files.find(f => f.startsWith(prefix) && !f.endsWith('.json'));
        if (match) {
          const filePath = path.join(dir, match);
          const ext = path.extname(match).toLowerCase();
          let mime = 'application/octet-stream';
          if (['.jpg', '.jpeg'].includes(ext)) mime = 'image/jpeg';
          else if (ext === '.png') mime = 'image/png';
          else if (ext === '.pdf') mime = 'application/pdf';
          else if (ext === '.txt') mime = 'text/plain';

          return {
            buffer: fs.readFileSync(filePath),
            contentType: mime,
            nomeArquivo: nomeOriginal || match.replace(prefix, ''),
          };
        }
      }
    } catch (e: any) {
      console.warn('[buscarArquivoLocal] Erro ao buscar local:', e?.message);
    }
    return null;
  }

  private removerArquivoLocal(codParc: number, nuAttach: number): void {
    try {
      const dir = this.getUploadDir();
      const metaPath = path.join(dir, `${codParc}_${nuAttach}.json`);
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const filePath = path.join(dir, meta.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        fs.unlinkSync(metaPath);
      }
      const prefix = `${codParc}_${nuAttach}_`;
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.filter(f => f.startsWith(prefix)).forEach(f => fs.unlinkSync(path.join(dir, f)));
      }
    } catch {
      /* ignora erro de remoção local */
    }
  }

  async salvarAnexoParceiro(
    codParc: number,
    nomeArquivo: string,
    descricao?: string,
    arquivo?: { content: Buffer; contentType: string },
  ): Promise<ClienteAnexoDto> {
    const pkStr = String(codParc);
    const desc = (descricao || nomeArquivo).trim().slice(0, 50);
    const sessionKey = `ANEXO_SISTEMA_Parceiro_${pkStr}`;

    // 1. Se há bytes, envia o arquivo físico para a área de sessão do Sankhya.
    if (arquivo && arquivo.content.length > 0) {
      const nomeLimpo = nomeArquivo.replace(/[\\/:*?"<>|]/g, '_');
      await this.sankhyaGateway.uploadSessionFile(sessionKey, nomeLimpo, arquivo.content, arquivo.contentType);
    }

    let nuAttachVal = 0;
    try {
      const response = await this.sankhyaGateway.serviceCall(
        'AnexoSistemaSP.salvar',
        {
          serviceName: 'AnexoSistemaSP.salvar',
          requestBody: {
            params: {
              pkEntity: pkStr,
              keySession: sessionKey,
              nameEntity: 'Parceiro',
              description: desc,
              keyAttach: '',
              typeAcess: 'ALL',
              typeApres: 'LOC',
              nuAttach: '',
              nameAttach: nomeArquivo,
              resourceID: 'br.com.sankhya.core.cad.parceiros',
              fileSelect: arquivo && arquivo.content.length > 0 ? 1 : 0,
              oldFile: '',
            },
          },
        },
        'mge',
      );
      nuAttachVal = parseInt(response?.responseBody?.chave?.valor, 10) || 0;
    } catch (error: any) {
      if (arquivo && arquivo.content.length > 0 && error?.message?.includes('Arquivo não encontrado')) {
        console.warn('[salvarAnexoParceiro] Upload em sessão expirado/indisponível no pod, registrando metadados via fileSelect=0:', error?.message);
        const responseFB = await this.sankhyaGateway.serviceCall(
          'AnexoSistemaSP.salvar',
          {
            serviceName: 'AnexoSistemaSP.salvar',
            requestBody: {
              params: {
                pkEntity: pkStr,
                keySession: sessionKey,
                nameEntity: 'Parceiro',
                description: desc,
                keyAttach: '',
                typeAcess: 'ALL',
                typeApres: 'LOC',
                nuAttach: '',
                nameAttach: nomeArquivo,
                resourceID: 'br.com.sankhya.core.cad.parceiros',
                fileSelect: 0,
                oldFile: '',
              },
            },
          },
          'mge',
        );
        nuAttachVal = parseInt(responseFB?.responseBody?.chave?.valor, 10) || 0;
      } else {
        throw error;
      }
    }

    if (arquivo && arquivo.content.length > 0 && nuAttachVal > 0) {
      this.salvarArquivoLocal(codParc, nuAttachVal, nomeArquivo, arquivo.content, arquivo.contentType);
    }

    return {
      nuAttach: nuAttachVal,
      fonte: 'TSIANX',
      nomeArquivo,
      descricao: desc,
      dataCadastro: new Date().toLocaleString('pt-BR'),
      tipoAcesso: 'ALL',
      tipoApres: 'LOC',
    };
  }

  /**
   * Extrai BLOB da TSIATA para um parceiro+sequencia específicos (chave exata).
   */
  private async buscarArquivoTsiataPorSeq(
    codParc: number,
    sequencia: number,
    nomeHint?: string,
  ): Promise<AnexoArquivoDto | null> {
    try {
      const metaRows = await this.sankhyaGateway.executeQuery(`
        SELECT CODATA, SEQUENCIA, ARQUIVO, DESCRICAO, TIPOCONTEUDO,
               DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO
        FROM TSIATA
        WHERE TIPO = 'P' AND CODATA = ${codParc} AND SEQUENCIA = ${sequencia}
          AND CONTEUDO IS NOT NULL AND DBMS_LOB.GETLENGTH(CONTEUDO) > 0
      `);

      if (!metaRows || metaRows.length === 0) {
        console.log(`[buscarArquivoTsiataPorSeq] Nenhum BLOB em TSIATA para codParc=${codParc}, seq=${sequencia}`);
        return null;
      }

      const meta = metaRows[0];
      const totalLen = parseInt(meta.TAMANHO, 10);
      const nomeArq = meta.ARQUIVO || meta.DESCRICAO || nomeHint || `anexo_seq${sequencia}`;

      if (!totalLen || totalLen <= 0) return null;

      console.log(`[buscarArquivoTsiataPorSeq] BLOB encontrado: ${nomeArq}, ${totalLen} bytes. Extraindo...`);

      const chunkSize = 2000;
      const batchSize = 30;
      const positions: number[] = [];
      for (let pos = 1; pos <= totalLen; pos += chunkSize) positions.push(pos);

      const resultsHex: string[] = new Array(positions.length);
      for (let i = 0; i < positions.length; i += batchSize) {
        const batch = positions.slice(i, i + batchSize);
        await Promise.all(
          batch.map((pos, idx) => {
            const q = `SELECT RAWTOHEX(DBMS_LOB.SUBSTR(CONTEUDO, ${chunkSize}, ${pos})) AS HEX_CHUNK FROM TSIATA WHERE TIPO='P' AND CODATA=${codParc} AND SEQUENCIA=${sequencia}`;
            return this.sankhyaGateway.executeQuery(q).then((res: any) => {
              resultsHex[i + idx] = res[0]?.HEX_CHUNK || '';
            });
          }),
        );
      }

      const fullBuffer = Buffer.concat(resultsHex.map(hex => Buffer.from(hex, 'hex')));
      if (fullBuffer.length === 0) return null;

      const ext = path.extname(nomeArq).toLowerCase();
      let contentType = 'application/octet-stream';
      if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.txt') contentType = 'text/plain';
      else if (ext === '.doc' || ext === '.docx') contentType = 'application/msword';
      else if (ext === '.xls' || ext === '.xlsx') contentType = 'application/vnd.ms-excel';
      // Detecta pelo magic bytes se a extensão não ajudou
      if (contentType === 'application/octet-stream' && fullBuffer.length >= 4) {
        const magic = fullBuffer.subarray(0, 4).toString('hex').toUpperCase();
        if (magic.startsWith('FFD8FF')) contentType = 'image/jpeg';
        else if (magic.startsWith('89504E47')) contentType = 'image/png';
        else if (magic.startsWith('25504446')) contentType = 'application/pdf';
      }

      // Salva em cache local para acesso rápido posterior
      this.salvarArquivoLocal(codParc, sequencia, nomeArq, fullBuffer, contentType);

      return { buffer: fullBuffer, contentType, nomeArquivo: nomeArq };
    } catch (err: any) {
      console.warn('[buscarArquivoTsiataPorSeq] Erro:', err?.message);
    }
    return null;
  }

  async baixarAnexoArquivo(
    codParc: number,
    sequencia: number,
    fonte: AnexoFonte,
    nomeArquivo?: string,
  ): Promise<AnexoArquivoDto | null> {
    console.log(`\n[baixarAnexoArquivo] codParc=${codParc}, seq=${sequencia}, fonte=${fonte}`);

    // --- Fonte TSIATA ---
    if (fonte === 'TSIATA') {
      // 0. Cache local
      const local = this.buscarArquivoLocal(codParc, sequencia, nomeArquivo);
      if (local) {
        console.log(`[baixarAnexoArquivo] TSIATA cache local encontrado (${local.buffer.length} bytes)`);
        return local;
      }
      // 1. Extrai BLOB diretamente do Oracle
      const tsiata = await this.buscarArquivoTsiataPorSeq(codParc, sequencia, nomeArquivo);
      if (tsiata) {
        console.log(`[baixarAnexoArquivo] TSIATA BLOB extraído (${tsiata.buffer.length} bytes)`);
        return tsiata;
      }
      console.log(`[baixarAnexoArquivo] TSIATA: BLOB não disponível para codParc=${codParc} seq=${sequencia}`);
      return null;
    }

    // --- Fonte TSIANX ---
    // Aqui sequencia = NUATTACH da TSIANX
    const nuAttach = sequencia;

    // 0. Cache local
    const local = this.buscarArquivoLocal(codParc, nuAttach, nomeArquivo);
    if (local) {
      console.log(`[baixarAnexoArquivo] TSIANX cache local encontrado (${local.buffer.length} bytes)`);
      return local;
    }

    // 1. Metadados da TSIANX
    const rows = await this.sankhyaGateway.executeQuery(`
      SELECT NUATTACH, NOMEARQUIVO, DESCRICAO, CHAVEARQUIVO
      FROM TSIANX WHERE NUATTACH = ${nuAttach}
    `);
    const anexo = rows[0];
    if (!anexo) {
      console.log(`[baixarAnexoArquivo] TSIANX: NUATTACH=${nuAttach} não encontrado`);
      return null;
    }

    // 2. AnexoSistemaSP.baixar → chave temporária → visualizadorArquivos
    try {
      const resBaixar = await this.sankhyaGateway.serviceCall(
        'AnexoSistemaSP.baixar',
        {
          serviceName: 'AnexoSistemaSP.baixar',
          requestBody: {
            paramsDown: {
              nuAttach: String(nuAttach),
              pkEntity: String(codParc),
              nameEntity: 'Parceiro',
              nameAttach: anexo.NOMEARQUIVO || '',
              keyAttach: anexo.CHAVEARQUIVO || '',
            },
          },
        },
        'mge',
      );
      const chaveTemp = resBaixar?.responseBody?.chave?.valor;
      if (chaveTemp) {
        const downloaded = await this.sankhyaGateway.downloadArquivo(chaveTemp);
        if (downloaded && downloaded.buffer.length > 0) {
          this.salvarArquivoLocal(codParc, nuAttach, anexo.NOMEARQUIVO || `anexo_${nuAttach}`, downloaded.buffer, downloaded.contentType);
          return { buffer: downloaded.buffer, contentType: downloaded.contentType, nomeArquivo: anexo.NOMEARQUIVO || `anexo_${nuAttach}` };
        }
      }
    } catch (err: any) {
      console.warn('[baixarAnexoArquivo] TSIANX AnexoSistemaSP.baixar falhou:', err?.message);
    }

    console.log(`[baixarAnexoArquivo] TSIANX: arquivo físico não disponível (codParc=${codParc}, nuAttach=${nuAttach})`);
    return null;
  }

  async removerAnexoParceiro(codParc: number, sequencia: number, fonte: AnexoFonte, descricao?: string): Promise<void> {
    this.removerArquivoLocal(codParc, sequencia);

    if (fonte === 'TSIATA') {
      // Usa Attach.remove para registros da TSIATA
      try {
        await this.sankhyaGateway.serviceCall('Attach.remove', {
          serviceName: 'Attach.remove',
          requestBody: {
            anexo: {
              codata: codParc,
              sequencia,
              tipo: 'P',
              descricao: descricao || '',
            },
            clientEventList: {
              clientEvent: [
                { $: 'parceiro.mostra.mensagem.criticaie' },
                { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
              ],
            },
          },
        }, 'mge');
        console.log(`[removerAnexoParceiro] TSIATA Attach.remove OK para codParc=${codParc}, seq=${sequencia}`);
      } catch (err: any) {
        console.warn('[removerAnexoParceiro] Attach.remove falhou:', err?.message);
        throw err;
      }
      return;
    }

    // TSIANX — usa AnexoSistemaSP.excluir (sequencia = NUATTACH)
    const nuAttach = sequencia;
    try {
      await this.sankhyaGateway.serviceCall('AnexoSistemaSP.excluir', {
        serviceName: 'AnexoSistemaSP.excluir',
        requestBody: {
          paramsDelete: {
            nuAttach: String(nuAttach),
            pkEntity: String(codParc),
            nameEntity: 'Parceiro',
            nameAttach: '',
            keyAttach: '',
          },
          clientEventList: {
            clientEvent: [
              { $: 'parceiro.mostra.mensagem.criticaie' },
              { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
            ],
          },
        },
      });
    } catch (error) {
      console.warn('[removerAnexoParceiro] AnexoSistemaSP.excluir falhou:', (error as any)?.message);
    }
  }

  private mapQueryToCliente(row: any): Cliente {
    return Cliente.create({
      codParc: parseInt(row.CODPARC),
      nomeParc: row.NOMEPARC || '',
      razaoSocial: row.RAZAOSOCIAL || null,
      cnpjCpf: row.CGC_CPF || null,
      tipoPessoa: (row.TIPPESSOA as TipoPessoa) || TipoPessoa.FISICA,
      situacao: (row.SITUACAO as SituacaoCliente) || null,
      ativo: row.ATIVO === 'S',
      telefone: row.TELEFONE || null,
      email: row.EMAIL || null,
      inscricaoEstadual: row.IDENTINSCESTAD || null,
      prazoPag: row.PRAZOPAG !== undefined && row.PRAZOPAG !== null && row.PRAZOPAG !== '' ? parseInt(row.PRAZOPAG) || null : null,
      limiteCredito: row.LIMCRED !== undefined && row.LIMCRED !== null && row.LIMCRED !== '' ? parseFloat(row.LIMCRED) || null : null,
      endereco: {
        codEnd: parseInt(row.CODEND) || 0,
        codBai: parseInt(row.CODBAI) || 0,
        codCid: parseInt(row.CODCID) || 0,
        logradouro: row.LOGRADOURO || null,
        numero: row.NUMEND || null,
        complemento: row.COMPLEMENTO || null,
        bairro: row.BAIRRO || null,
        cidade: row.CIDADE || null,
        uf: row.UF || null,
        cep: row.CEP || null,
      },
      dataCadastro: this.parseDate(row.DTCAD),
      dataUltimaAlteracao: row.DTALTER ? this.parseDate(row.DTALTER) : null,
      observacoes: row.OBSERVACOES || null,
      limiteCreditoMensal: row.LIMCREDMENSAL ? parseFloat(row.LIMCREDMENSAL) || null : null,
      qtdMaxTitVencidos: row.QTDMAXTITVENCIDOS ? parseInt(row.QTDMAXTITVENCIDOS) || null : null,
      codTab: row.CODTAB || null,
      codVend: row.CODVEND ? parseInt(row.CODVEND) || null : null,
      codBco: row.CODBCO ? parseInt(row.CODBCO) || null : null,
      descBonif: row.DESCBONIF || null,
      descFin: row.DESCFIN ? parseFloat(row.DESCFIN) || null : null,
      inscricaoMunicipal: row.INSCMUN || null,
      classificacaoIcms: row.CLASSIFICMS || null,
      retemIss: row.RETEMISS || null,
      retemInss: row.RETEMINSS || null,
      retemPis: row.RETEMPIS || null,
      retemCofins: row.RETEMCOFINS || null,
      retemCsl: row.RETEMCSL || null,
      adCredCli: row.AD_CREDCLI ? parseFloat(row.AD_CREDCLI) || null : null,
      adLimitePar: row.AD_LIMITEPAR ? parseFloat(row.AD_LIMITEPAR) || null : null,
      adLocalCad: row.AD_LOCALCAD || null,
      adEndCompleto: [
        row.LOGRADOURO,
        row.NUMEND ? `Nº ${row.NUMEND}` : null,
        row.BAIRRO,
        row.CIDADE ? `${row.CIDADE}${row.UF ? '/' + row.UF : ''}` : null,
      ].filter(Boolean).join(', ') || null,
      adCodBcoBol: row.AD_CODBCOBOL ? parseInt(row.AD_CODBCOBOL) || null : null,
      adDtUltCompra: row.AD_DTULTCOMPRA ? this.parseDate(row.AD_DTULTCOMPRA) : null,
      simples: row.SIMPLES || null,
      perfilEconect: row.PERFILECONECT || null,
      tipoFatur: row.TIPOFATUR || null,
      regimeEspTribIss: row.REGIMEESPTRIBISS || null,
      tipoClienteServCom: row.TIPCLIENTESERVCOM || null,
      emailNotifEntrega: row.EMAILNOTIFENTREGA || null,
      entregaEndContato: row.ENTREGAENDCONTATO || null,
      exigContatoEntCab: row.EXIGCONTATOENTCAB || null,
      latitude: row.LATITUDE || null,
      longitude: row.LONGITUDE || null,
      latitudeEntrega: row.LATITUDE_ENTREGA || null,
      longitudeEntrega: row.LONGITUDE_ENTREGA || null,
      // enderecoEntrega: null quando não há dado real (CTT vazio e CPL zerado)
      enderecoEntrega: (() => {
        const codEnd = parseInt(row.CODEND_ENTREGA) || 0;
        const codBai = parseInt(row.CODBAI_ENTREGA) || 0;
        const codCid = parseInt(row.CODCID_ENTREGA) || 0;
        const logradouro = row.LOGRADOURO_ENTREGA || null;
        const numero = row.NUMEND_ENTREGA || null;
        const complemento = row.COMPLEMENTO_ENTREGA || null;
        const bairro = row.BAIRRO_ENTREGA || null;
        const cidade = row.CIDADE_ENTREGA || null;
        const uf = row.UF_ENTREGA || null;
        const cep = row.CEP_ENTREGA || null;
        const nomeContato = row.CONTATO_ENTREGA || null;
        // Sem nenhum campo real → retorna null (sem endereço de entrega cadastrado)
        if (!codEnd && !codBai && !codCid && !logradouro && !cidade && !cep && !numero) {
          return null;
        }
        return { codEnd, codBai, codCid, logradouro, numero, complemento, bairro, cidade, uf, cep, nomeContato };
      })(),
      nomeBco: row.NOMEBCO && row.NOMEBCO !== '<SEM BANCO>' ? row.NOMEBCO : null,
      adNomeBcoBol: row.NOMEBCOBOL && row.NOMEBCOBOL !== '<SEM BANCO>' ? row.NOMEBCOBOL : null,
      nomeVend: row.NOMEVEND && row.NOMEVEND !== '<SEM VENDEDOR>' ? row.NOMEVEND : null,
      codTipParc: row.CODTIPPARC ? parseInt(row.CODTIPPARC) || null : null,
      codReg: row.CODREG ? parseInt(row.CODREG) || null : null,
      grupoAutor: row.GRUPOAUTOR ? parseInt(row.GRUPOAUTOR) || null : null,
      bloquear: row.BLOQUEAR || null,
      motBloq: row.MOTBLOQ || null,
      tipAnexoNfe: row.TIPANEXONFE || null,
      emailDanfe: row.EMAILDANFE || null,
      emailNfe: row.EMAILNFE || null,
      adDtAprovRep: row.AD_DTAPROVREP ? this.parseDate(row.AD_DTAPROVREP) : null,
      nomeTipParc: row.NOMETIPPARC && row.NOMETIPPARC !== '<SEM TIPO PARCEIRO>' ? row.NOMETIPPARC : null,
      nomeReg: row.NOMEREG && row.NOMEREG !== '<SEM REGIAO>' ? row.NOMEREG : null,
    });
  }

  private parseDate(dateStr: string | Date | null): Date {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;

    const str = String(dateStr).trim();

    const sankhyaMatch = str.match(/^(\d{2})(\d{2})(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (sankhyaMatch) {
      const [, dd, mm, yyyy, hh, mi, ss] = sankhyaMatch;
      return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(mi), parseInt(ss));
    }

    const sankhyaDateOnly = str.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (sankhyaDateOnly) {
      const [, dd, mm, yyyy] = sankhyaDateOnly;
      return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    }

    const iso = new Date(str);
    if (!isNaN(iso.getTime())) return iso;

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
}