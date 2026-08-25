/**
 * Diagnóstico: endereço de entrega do cliente 31547
 * Verifica o que existe em TGFCTT, TGFCPL e TGFPAR para este parceiro.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { ConfigService } from '@nestjs/config';

async function main() {
  const configService = { get: (key: string) => process.env[key] } as any as ConfigService;
  const gateway = new SankhyaGateway(configService);

  const CODPARC = 31547;

  console.log('=== TGFPAR (endereço principal) ===');
  const par = await gateway.executeQuery(`
    SELECT PAR.CODPARC, PAR.NOMEPARC,
           PAR.CODEND, ENDP.NOMEEND,
           PAR.NUMEND, PAR.COMPLEMENTO, PAR.CEP,
           PAR.CODBAI, BAI.NOMEBAI,
           PAR.CODCID, CID.NOMECID, UFS.UF
    FROM TGFPAR PAR
    LEFT JOIN TSIEND ENDP ON ENDP.CODEND = PAR.CODEND
    LEFT JOIN TSIBAI BAI ON BAI.CODBAI = PAR.CODBAI
    LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
    LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
    WHERE PAR.CODPARC = ${CODPARC}
  `);
  console.log(JSON.stringify(par, null, 2));

  console.log('\n=== TGFCTT (endereço de entrega — contatos) ===');
  const ctt = await gateway.executeQuery(`
    SELECT CTT.CODCONTATO, CTT.NOMECONTATO,
           CTT.CODEND, ENDP.NOMEEND,
           CTT.NUMEND, CTT.COMPLEMENTO, CTT.CEP,
           CTT.CODBAI, BAI.NOMEBAI,
           CTT.CODCID, CID.NOMECID
    FROM TGFCTT CTT
    LEFT JOIN TSIEND ENDP ON ENDP.CODEND = CTT.CODEND
    LEFT JOIN TSIBAI BAI ON BAI.CODBAI = CTT.CODBAI
    LEFT JOIN TSICID CID ON CID.CODCID = CTT.CODCID
    WHERE CTT.CODPARC = ${CODPARC}
    ORDER BY CTT.CODCONTATO ASC
  `);
  console.log(ctt.length > 0 ? JSON.stringify(ctt, null, 2) : '(nenhum registro em TGFCTT)');

  console.log('\n=== TGFCPL (complemento — endereço de entrega alternativo) ===');
  const cpl = await gateway.executeQuery(`
    SELECT CPL.CODPARC,
           CPL.CODENDENTREGA, CPL.NUMENTREGA, CPL.COMPLENTREGA, CPL.CEPENTREGA,
           CPL.CODBAIENTREGA, CPL.CODCIDENTREGA,
           CPL.LATITUDEENTREGA, CPL.LONGITUDEENTREGA
    FROM TGFCPL CPL
    WHERE CPL.CODPARC = ${CODPARC}
  `);
  console.log(cpl.length > 0 ? JSON.stringify(cpl, null, 2) : '(nenhum registro em TGFCPL)');

  console.log('\n=== Resultado com NOVA query (NULLIF, sem fallback PAR) ===');
  const coalesce = await gateway.executeQuery(`
    SELECT
      COALESCE(CTT.CODEND, NULLIF(CPL.CODENDENTREGA, 0)) AS CODEND_ENTREGA,
      ENDENT.NOMEEND AS LOGRADOURO_ENTREGA,
      COALESCE(CTT.NUMEND, CPL.NUMENTREGA) AS NUMEND_ENTREGA,
      COALESCE(CTT.CODBAI, NULLIF(CPL.CODBAIENTREGA, 0)) AS CODBAI_ENTREGA,
      COALESCE(CTT.CODCID, NULLIF(CPL.CODCIDENTREGA, 0)) AS CODCID_ENTREGA,
      COALESCE(CTT.CEP, CPL.CEPENTREGA) AS CEP_ENTREGA,
      CTT.NOMECONTATO AS CONTATO_ENTREGA,
      -- Flags para diagnóstico
      CASE WHEN CTT.CODPARC IS NOT NULL THEN 'S' ELSE 'N' END AS TEM_CTT,
      CASE WHEN CPL.CODPARC IS NOT NULL THEN 'S' ELSE 'N' END AS TEM_CPL,
      CASE
        WHEN CTT.CODEND IS NOT NULL THEN 'CTT'
        WHEN NULLIF(CPL.CODENDENTREGA, 0) IS NOT NULL THEN 'CPL'
        ELSE 'VAZIO(null esperado)'
      END AS FONTE_CODEND
    FROM TGFPAR PAR
    LEFT JOIN (
      SELECT CODPARC, CODEND, NUMEND, COMPLEMENTO, CODBAI, CODCID, CEP, NOMECONTATO
      FROM (
        SELECT CODPARC, CODEND, NUMEND, COMPLEMENTO, CODBAI, CODCID, CEP, NOMECONTATO,
               ROW_NUMBER() OVER (PARTITION BY CODPARC ORDER BY CODCONTATO ASC) AS RN
        FROM TGFCTT
        WHERE CODEND IS NOT NULL OR CEP IS NOT NULL
      ) WHERE RN = 1
    ) CTT ON CTT.CODPARC = PAR.CODPARC
    LEFT JOIN TGFCPL CPL ON CPL.CODPARC = PAR.CODPARC
    LEFT JOIN TSIEND ENDENT ON ENDENT.CODEND = COALESCE(CTT.CODEND, NULLIF(CPL.CODENDENTREGA, 0))
    LEFT JOIN TSIBAI BAIENT ON BAIENT.CODBAI = COALESCE(CTT.CODBAI, NULLIF(CPL.CODBAIENTREGA, 0))
    LEFT JOIN TSICID CIDENT ON CIDENT.CODCID = COALESCE(CTT.CODCID, NULLIF(CPL.CODCIDENTREGA, 0))
    LEFT JOIN TSIUFS UFSENT ON UFSENT.CODUF = CIDENT.UF
    WHERE PAR.CODPARC = ${CODPARC}
  `);
  console.log(JSON.stringify(coalesce, null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
