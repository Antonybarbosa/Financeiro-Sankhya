import { parseStringPromise } from 'xml2js';
import { NfeDados, NfeItem } from '../../domain/entities/nfe.entity';

function get(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    const val = acc[key];
    if (Array.isArray(val)) return val[0];
    return val;
  }, obj);
}

function getStr(obj: any, path: string): string {
  const val = get(obj, path);
  return val && typeof val === 'object' && val._ !== undefined ? val._ : val;
}

function getNum(obj: any, path: string): number {
  const raw = getStr(obj, path);
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^\d,.-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export async function parse(xml: string): Promise<Partial<NfeDados>> {
  const cleanedXml = xml.trim().replace(/>\s+</g, '><');
  const result = await parseStringPromise(cleanedXml, {
    explicitArray: false,
    ignoreAttrs: true,
    mergeAttrs: true,
  });

  const nfeProc = result.nfeProc || result;
  const NFe = nfeProc.NFe || nfeProc;
  const infNFe = NFe.infNFe || {};
  const ide = infNFe.ide || {};
  const emit = infNFe.emit || {};
  const emitEnder = emit.enderEmit || {};
  const dest = infNFe.dest || {};
  const destEnder = dest.enderDest || {};
  const total = infNFe.total?.ICMSTot || {};
  const transp = infNFe.transp || {};
  const pag = infNFe.pag || {};
  const detList = infNFe.det;

  const detArray = Array.isArray(detList) ? detList : detList ? [detList] : [];
  const itens: NfeItem[] = detArray.map((det: any, index: number) => {
    const prod = det.prod || {};
    return {
      numero: parseInt(getStr(det, 'nItem') || '') || index + 1,
      codigo: getStr(prod, 'cProd') || '',
      descricao: getStr(prod, 'xProd') || '',
      ncm: getStr(prod, 'NCM') || '',
      cfop: getStr(prod, 'CFOP') || '',
      unidade: getStr(prod, 'uCom') || '',
      quantidade: getNum(prod, 'qCom'),
      valorUnitario: getNum(prod, 'vUnCom'),
      valorTotal: getNum(prod, 'vProd'),
      desconto: getNum(prod, 'vDesc'),
    };
  });

  const protNFe = nfeProc.protNFe?.infProt || {};
  const pagamento = pag.detPag || pag;
  const pagInfo = Array.isArray(pagamento) ? pagamento[0] : pagamento;

  return {
    chave: getStr(infNFe, 'Id')?.replace('NFe', '') || '',
    modelo: getStr(ide, 'mod') || getStr(ide, 'tpAmb'),
    status: getStr(protNFe, 'cStat') ? `${getStr(protNFe, 'cStat')} - ${getStr(protNFe, 'xMotivo')}` : '',
    dataEmissao: getStr(ide, 'dhEmi') || getStr(ide, 'dEmi') || null,
    dataSaida: getStr(ide, 'dhSaiEnt') || getStr(ide, 'dSaiEnt') || null,
    numero: getStr(ide, 'nNF') || '',
    serie: getStr(ide, 'serie') || '',
    naturezaOperacao: getStr(ide, 'natOp') || '',
    emitente: {
      cnpj: getStr(emit, 'CNPJ') || getStr(emit, 'CPF') || '',
      razaoSocial: getStr(emit, 'xNome') || '',
      ie: getStr(emit, 'IE') || '',
      endereco: `${getStr(emitEnder, 'xLgr') || ''} ${getStr(emitEnder, 'nro') || ''}`.trim(),
      bairro: getStr(emitEnder, 'xBairro') || '',
      municipio: getStr(emitEnder, 'xMun') || '',
      uf: getStr(emitEnder, 'UF') || '',
      cep: getStr(emitEnder, 'CEP') || '',
      fone: getStr(emitEnder, 'fone') || '',
    },
    destinatario: {
      cnpjCpf: getStr(dest, 'CNPJ') || getStr(dest, 'CPF') || '',
      razaoSocial: getStr(dest, 'xNome') || '',
      ie: getStr(dest, 'IE') || '',
      endereco: `${getStr(destEnder, 'xLgr') || ''} ${getStr(destEnder, 'nro') || ''}`.trim(),
      bairro: getStr(destEnder, 'xBairro') || '',
      municipio: getStr(destEnder, 'xMun') || '',
      uf: getStr(destEnder, 'UF') || '',
      cep: getStr(destEnder, 'CEP') || '',
      fone: getStr(destEnder, 'fone') || '',
      email: getStr(dest, 'email') || '',
    },
    itens,
    totais: {
      baseCalculoIcms: getNum(total, 'vBC'),
      valorIcms: getNum(total, 'vICMS'),
      baseCalculoIcmsSt: getNum(total, 'vBCST'),
      valorIcmsSt: getNum(total, 'vST'),
      valorProdutos: getNum(total, 'vProd'),
      valorFrete: getNum(total, 'vFrete'),
      valorSeguro: getNum(total, 'vSeg'),
      valorDesconto: getNum(total, 'vDesc'),
      valorIpi: getNum(total, 'vIPI'),
      valorPis: getNum(total, 'vPIS'),
      valorCofins: getNum(total, 'vCOFINS'),
      valorTotal: getNum(total, 'vNF'),
    },
    transporte: {
      modalidadeFrete: getStr(transp, 'modFrete') || '',
      transportadora: getStr(transp, 'transporta.xNome') || '',
    },
    pagamento: {
      forma: getStr(pagInfo, 'tPag') || '',
      valor: getNum(pagInfo, 'vPag'),
    },
    qrCode: getStr(infNFe, 'infSupl.qrCode') || null,
  };
}

export const xml2jsParser = { parse };
