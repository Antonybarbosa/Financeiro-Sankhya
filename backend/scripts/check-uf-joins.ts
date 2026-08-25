/** Validação dos SQLs corrigidos com JOIN TSIUFS (UF sigla) */
import 'dotenv/config';

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const CLIENT_ID = process.env.GATEWAY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GATEWAY_CLIENT_SECRET || '';
const X_TOKEN = process.env.GATEWAY_X_TOKEN || '';

async function main() {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  const resp = await fetch(`${GATEWAY_URL}/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Token': X_TOKEN },
    body: params.toString(),
  });
  const { access_token: token } = (await resp.json()) as any;

  const query = async (sql: string) => {
    const r = await fetch(
      `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
      },
    );
    const d = await r.json() as any;
    if (d.status === '0') throw new Error(d.statusMessage);
    return d.responseBody.rows || [];
  };

  console.log('=== 1. findAll cliente (JOIN TSIUFS) ===');
  const r1 = await query(`
    SELECT * FROM (
      SELECT PAR.CODPARC, PAR.NOMEPARC, UFS.UF AS UF
      FROM TGFPAR PAR
      LEFT JOIN TSIEND ENDP ON ENDP.CODEND = PAR.CODEND
      LEFT JOIN TSIBAI BAI ON BAI.CODBAI = PAR.CODBAI
      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
      WHERE 1=1
      ORDER BY PAR.NOMEPARC ASC
    ) WHERE ROWNUM <= 5`);
  console.table(r1.map((r: any[]) => ({ CODPARC: r[0], NOMEPARC: r[1], UF: r[2] })));

  console.log('=== 2. findFilaCobranca (MAX(UFS.UF)) ===');
  const r2 = await query(`
    SELECT * FROM (
      SELECT FIN.CODPARC, MAX(CID.NOMECID) AS CIDADE, MAX(UFS.UF) AS UF,
        ROW_NUMBER() OVER (ORDER BY SUM(NVL(FIN.VLRDESDOB,0) - NVL(FIN.VLRBAIXA,0)) DESC) AS RN
      FROM TGFFIN FIN
      INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
      LEFT JOIN TSIEND ENDP ON ENDP.CODEND = PAR.CODEND
      LEFT JOIN TSIBAI BAI ON BAI.CODBAI = PAR.CODBAI
      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
      WHERE FIN.RECDESP=1 AND FIN.DHBAIXA IS NULL
      GROUP BY FIN.CODPARC
      HAVING SUM(NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0)) > 0
    ) WHERE RN <= 5`);
  console.table(r2.map((r: any[]) => ({ CODPARC: r[0], CIDADE: r[1], UF: r[2] })));

  console.log('=== 3. findBoleto (UFS + CMPUFS) ===');
  const r3 = await query(`
    SELECT UFS.UF AS UF, CMPUFS.UF AS CEDENTE_UF
    FROM TGFFIN FIN
    INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
    LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
    LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
    LEFT JOIN TSIEMP CMP ON CMP.CODEMP = FIN.CODEMP
    LEFT JOIN TSICID CMPCID ON CMPCID.CODCID = CMP.CODCID
    LEFT JOIN TSIUFS CMPUFS ON CMPUFS.CODUF = CMPCID.UF
    WHERE FIN.RECDESP = 1 AND ROWNUM <= 3`);
  console.table(r3.map((r: any[]) => ({ UF_SACADO: r[0], UF_CEDENTE: r[1] })));
}

main().catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});
