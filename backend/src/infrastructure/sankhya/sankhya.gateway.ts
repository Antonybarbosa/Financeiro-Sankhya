import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SankhyaConfig {
  url: string;
  clientId: string;
  clientSecret: string;
  xToken: string;
}

@Injectable()
export class SankhyaGateway implements OnModuleDestroy {
  private token: string | null = null;
  private tokenExpiry: number = 0;
  /** jsessionId embutido no claim do JWT OAuth — usado como Cookie para afinidade de sessão (upload de anexos). */
  private jsessionId: string | null = null;
  private config: SankhyaConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      url: this.configService.get('GATEWAY_URL') || 'https://api.sandbox.sankhya.com.br',
      clientId: this.configService.get('GATEWAY_CLIENT_ID') || '',
      clientSecret: this.configService.get('GATEWAY_CLIENT_SECRET') || '',
      xToken: this.configService.get('GATEWAY_X_TOKEN') || '',
    };
  }

  async authenticate(): Promise<string> {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', this.config.clientId);
    params.append('client_secret', this.config.clientSecret);

    const response = await fetch(`${this.config.url}/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Token': this.config.xToken,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Sankhya authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    this.jsessionId = this.extrairJsessionId(this.token);

    return this.token;
  }

  private extrairJsessionId(jwt: string): string | null {
    try {
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'));
      return payload.jsessionId || null;
    } catch {
      return null;
    }
  }

  /** Cookie de afinidade de sessão — garante que upload e salvamento do anexo caiam no mesmo pod do cluster. */
  getAuthCookie(): string | null {
    return this.jsessionId ? `JSESSIONID=${this.jsessionId}` : null;
  }

  getGatewayUrl(): string {
    return this.config.url;
  }

  async getToken(): Promise<string> {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      return await this.authenticate();
    }
    return this.token;
  }

  /**
   * Executa um serviço no Gateway Sankhya.
   * A chamada roda com o usuário de integração do token OAuth — o teste real
   * (debug-contato-save.ts) confirmou que esse usuário consegue gravar PENDENTE
   * em TGFTEL sem precisar de sessão de usuário (mgeSession).
   */
  async serviceCall(serviceName: string, body: any, module: 'mge' | 'mgecom' | 'mgefin' | 'mgebase' = 'mge', extraHeaders?: Record<string, string>): Promise<any> {
    const token = await this.getToken();
    const endpoint = `${this.config.url}/gateway/v1/${module}/service.sbr`;

    const url = `${endpoint}?serviceName=${serviceName}&outputType=json`;

    const nurel = body?.requestBody?.records?.[0]?.pk?.NUREL;
    console.log(`[SankhyaGateway] ${serviceName} NUREL=${nurel || '-'} url=${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(extraHeaders || {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Sankhya API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === '0') {
      // Inclui o NUREL na mensagem para facilitar o diagnóstico de qual registro falhou
      const ctx = nurel ? ` (NUREL=${nurel})` : '';
      throw new Error(`Sankhya service error: ${data.statusMessage || 'Unknown error'}${ctx}`);
    }

    return data;
  }

  async loadRecords(entityName: string, fields: string[], criteria?: any, joins?: any[]): Promise<any[]> {
    const requestBody: any = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: entityName,
          includePresentationFields: 'N',
          offsetPage: '0',
          entity: [
            { path: '', fieldset: { list: fields.join(',') } }
          ]
        }
      }
    };

    if (criteria) {
      requestBody.requestBody.dataSet.criteria = criteria;
    }

    if (joins && joins.length > 0) {
      requestBody.requestBody.dataSet.entity = requestBody.requestBody.dataSet.entity.concat(joins);
    }

    const result = await this.serviceCall('CRUDServiceProvider.loadRecords', requestBody);

    if (!result.responseBody?.entities?.entity) {
      return [];
    }

    const entities = Array.isArray(result.responseBody.entities.entity) 
      ? result.responseBody.entities.entity 
      : [result.responseBody.entities.entity];

    const fieldsMetadata = result.responseBody.entities.metadata?.fields?.field || [];
    
    return entities.map((entity: any) => this.mapEntityToDto(entity, fieldsMetadata));
  }

  async saveRecord(entityName: string, pk: any, fields: string[], values: string[]): Promise<any> {
    const requestBody = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: entityName,
        standAlone: false,
        fields: fields,
        records: [
          {
            pk: pk,
            values: fields.reduce((acc, field, index) => {
              acc[index.toString()] = values[index];
              return acc;
            }, {} as any)
          }
        ]
      }
    };

    const result = await this.serviceCall('DatasetSP.save', requestBody);
    console.log(`[SankhyaGateway] DatasetSP.save result for ${entityName}:`, JSON.stringify(result?.responseBody || result).substring(0, 500));
    return result;
  }

  async saveChildRecord(
    parentEntityName: string,
    parentPk: any,
    childEntityName: string,
    childPk: any,
    fields: string[],
    values: string[],
  ): Promise<any> {
    const parentPkKeys = Object.keys(parentPk);
    const requestBody = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: parentEntityName,
        standAlone: false,
        fields: parentPkKeys,
        records: [
          {
            pk: parentPk,
            values: parentPkKeys.reduce((acc, k, idx) => {
              acc[idx.toString()] = String(parentPk[k]);
              return acc;
            }, {} as any),
            entities: {
              entity: [
                {
                  entityName: childEntityName,
                  fields: fields,
                  records: [
                    {
                      pk: childPk,
                      values: fields.reduce((acc, field, index) => {
                        acc[index.toString()] = values[index];
                        return acc;
                      }, {} as any),
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    };

    const result = await this.serviceCall('DatasetSP.save', requestBody);
    console.log(`[SankhyaGateway] DatasetSP.save child result for ${childEntityName}:`, JSON.stringify(result?.responseBody || result).substring(0, 500));
    return result;
  }

  // Campos da tela nativa Relacionamento.xhtml5 (Telemarketing) — capturados via
  // fetch real do navegador. A ORDEM importa: o DatasetSP.save indexa os values
  // pela posição nesta lista (ex.: PENDENTE = índice 3).
  private static readonly CAMPOS_RELACIONAMENTO = [
    'NUREL', 'NUAVISO', 'NUMOS', 'PENDENTE', 'TIPCHAM', 'CODATENDENTE', 'Atendente.NOMEUSU',
    'CODPARC', 'Parceiro.RAZAOSOCIAL', 'TELEFONEPARC', 'CODCONTATO', 'Contato.NOMECONTATO',
    'DHCHAMADA', 'DHPROXCHAM', 'TEMPPREVISTO', 'CODUSU', 'Executante.NOMEUSU', 'CODHIST',
    'HistoricoTele.DESCRHIST', 'COMENTARIOS', 'CODPROD', 'CODVEND', 'COMENTARIOS2', 'DTALTER',
    'SITUACAO', 'AD_TIPCHAMADA', 'AD_HRCHECKOUT', 'AD_HRCHECKIN', 'AD_HISTORICO', 'AD_CHECKOUT',
    'AD_CHECKIN', 'AD_TIPO', 'AD_HISTCOBRA', 'AD_MSG',
  ];

  /**
   * Salva um registro de Relacionamento (TGFTEL) com o payload EXATO da tela
   * nativa de Telemarketing. Comprovado por teste (scripts/debug-finalizar-*.ts):
   * o payload simples (só o campo PENDENTE) é BLOQUEADO com "Usuário logado não
   * tem autorização para alterar este item!", mas o payload nativo completo —
   * com dataSetID, crudListener e txProperties 'br.com.sankhya.mgecom.Telemarketing'
   * — aplica S→N (finalizar) inclusive SEM sessão de usuário.
   */
  async saveRecordTelemarketing(pk: any, fields: string[], values: string[]): Promise<any> {
    const valuesMap: any = {};
    fields.forEach((field, index) => {
      const pos = SankhyaGateway.CAMPOS_RELACIONAMENTO.indexOf(field);
      if (pos >= 0) {
        valuesMap[pos.toString()] = values[index];
      }
    });

    const requestBody = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        dataSetID: '00H',
        entityName: 'Relacionamento',
        standAlone: false,
        fields: SankhyaGateway.CAMPOS_RELACIONAMENTO,
        records: [{ pk: pk, values: valuesMap }],
        crudListener: 'br.com.sankhya.mgeserv.model.helpper.RelacionamentoCRUDListener',
        txProperties: { 'br.com.sankhya.mgecom.Telemarketing': true },
        ignoreListenerMethods: '',
        clientEventList: { clientEvent: [{ $: 'br.com.sankhya.actionbutton.clientconfirm' }] },
      },
    };

    return await this.serviceCall('DatasetSP.save', requestBody);
  }

  /**
   * Envia os bytes de um arquivo para a área de sessão do Sankhya
   * (sessionUpload.mge, multipart). Depois disso, `AnexoSistemaSP.salvar`
   * com fileSelect=1 vincula o arquivo enviado a um registro (TSIANX).
   * Fluxo documentado em developer.sankhya.com.br ("Anexar Arquivos").
   */
  async uploadSessionFile(sessionKey: string, fileName: string, content: Buffer, contentType: string): Promise<void> {
    const token = await this.getToken();
    const url = `${this.config.url}/gateway/v1/mge/sessionUpload.mge?sessionkey=${encodeURIComponent(sessionKey)}&fitem=S&salvar=S&useCache=N`;

    const formData = new FormData();
    formData.append('arquivo', new Blob([content as unknown as BlobPart], { type: 'application/octet-stream' }), fileName);

    // Cookie de afinidade: sem ele o upload pode cair num pod diferente do
    // serviço que vincula o anexo — o arquivo "some" da sessão e o
    // AnexoSistemaSP.salvar falha com "Arquivo não encontrado" (cluster sandbox).
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/html',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Sankhya sessionUpload failed: ${response.statusText}`);
    }

    const html = await response.text();
    // Página de sucesso contém window.close() sem toEval; erros aparecem no corpo.
    if (/Erro|erro|exce/i.test(html) && !html.includes('window.close()')) {
      throw new Error(`Sankhya sessionUpload rejeitou o arquivo: ${html.replace(/\s+/g, ' ').slice(0, 200)}`);
    }
  }

  /**
   * Baixa bytes de arquivo via visualizadorArquivos.mge.
   * Retorna null quando o servidor responde "arquivo não existe" (HTML) —
   * acontece quando o repositório físico do ambiente não é acessível
   * pelo gateway (comportamento observado no sandbox).
   */
  async downloadArquivo(chaveArquivo: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const token = await this.getToken();
    const url = `${this.config.url}/gateway/v1/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${encodeURIComponent(chaveArquivo)}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Sankhya downloadArquivo failed: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Resposta de erro do visualizador vem como HTML (ex.: "O arquivo solicitado não existe no servidor.")
    const looksHtml = contentType.includes('text/html') || buffer.subarray(0, 6).toString('ascii').startsWith('<html');
    if (looksHtml) {
      return null;
    }

    return { buffer, contentType };
  }

  async executeQuery(sql: string): Promise<any[]> {
    const requestBody = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: {
        sql: sql
      }
    };

    const result = await this.serviceCall('DbExplorerSP.executeQuery', requestBody);
    
    if (!result.responseBody?.rows) {
      return [];
    }

    const fields = result.responseBody.fieldsMetadata || [];
    const rows = Array.isArray(result.responseBody.rows) 
      ? result.responseBody.rows 
      : [result.responseBody.rows];

    return rows.map((row: any) => {
      return fields.reduce((acc: any, field: any, index: number) => {
        acc[field.name] = row[index];
        return acc;
      }, {});
    });
  }

  private mapEntityToDto(entity: any, fieldsMetadata: any[]): any {
    const dto: any = {};
    
    if (fieldsMetadata.length === 0) {
      Object.keys(entity).forEach(key => {
        const value = entity[key];
        dto[key] = value?.$ || value;
      });
      return dto;
    }

    fieldsMetadata.forEach((field, index) => {
      const fieldKey = `f${index}`;
      if (entity[fieldKey]) {
        dto[field.name] = entity[fieldKey].$;
      }
    });

    return dto;
  }

  onModuleDestroy() {
    this.token = null;
  }
}