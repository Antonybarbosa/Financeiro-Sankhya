import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ClienteUseCases } from '../../application/use-cases/cliente.use-cases';
import { TituloUseCases } from '../../application/use-cases/titulo.use-cases';
import { ContatoUseCases } from '../../application/use-cases/contato.use-cases';
import { SankhyaGateway } from '../../infrastructure/sankhya/sankhya.gateway';
import { TipoContato, SituacaoContato } from '../../domain/entities/contato.entity';
import { StatusTitulo } from '../../domain/entities/titulo.entity';
import { Public } from '../auth/public.decorator';

@Controller('api/whatsapp')
export class WhatsAppController {
  constructor(
    private readonly clienteUseCases: ClienteUseCases,
    private readonly tituloUseCases: TituloUseCases,
    private readonly contatoUseCases: ContatoUseCases,
    private readonly sankhyaGateway: SankhyaGateway,
  ) {}

  /**
   * Busca clientes no Sankhya por Telefone, Celular ou Nome/Razão Social
   */
  @Public()
  @Get('cliente-por-telefone')
  async buscarClientePorTelefone(@Query('telefone') telefone: string) {
    if (!telefone || !telefone.trim()) {
      return { encontrado: false, clientes: [], cliente: null };
    }

    const termo = telefone.trim();
    const apenasNumeros = termo.replace(/\D/g, '');
    const temTelefoneValido = apenasNumeros.length >= 8;
    const ultimosDigitos = temTelefoneValido ? apenasNumeros.slice(-8) : '';
    const nomeTermo = termo.replace(/'/g, "''").toUpperCase();

    console.log(`[WhatsApp Backend] Buscando cliente por telefone. Termo: "${termo}", Apenas números: "${apenasNumeros}", Últimos 8 dígitos: "${ultimosDigitos}"`);

    // Busca estritamente por dígitos de telefone ou celular
    if (!temTelefoneValido) {
      console.warn(`[WhatsApp Backend] Telefone inválido (< 8 dígitos): "${termo}"`);
      return { encontrado: false, clientes: [], cliente: null, termoBuscado: termo, ultimosDigitos: '' };
    }

    const condicoes: string[] = [
      `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(PAR.TELEFONE, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '') LIKE '%${ultimosDigitos}%'`,
      `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CTT.TELEFONE, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '') LIKE '%${ultimosDigitos}%'`,
      `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CTT.CELULAR, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '') LIKE '%${ultimosDigitos}%'`,
    ];

    const sql = `
      SELECT * FROM (
        SELECT DISTINCT
          PAR.CODPARC,
          PAR.NOMEPARC,
          PAR.RAZAOSOCIAL,
          PAR.CGC_CPF,
          PAR.TELEFONE,
          PAR.EMAIL,
          PAR.TIPPESSOA,
          PAR.LIMCRED,
          PAR.SITUACAO
        FROM TGFPAR PAR
        LEFT JOIN TGFCTT CTT ON CTT.CODPARC = PAR.CODPARC
        WHERE ${condicoes.join(' OR ')}
        ORDER BY PAR.NOMEPARC ASC
      ) WHERE ROWNUM <= 10
    `;

    try {
      console.log(`[WhatsApp Backend] Executando SQL no Sankhya:\n${sql}`);
      const rows = await this.sankhyaGateway.executeQuery(sql);
      console.log(`[WhatsApp Backend] Linhas retornadas do Sankhya: ${rows ? rows.length : 0}`);
      if (!rows || rows.length === 0) {
        return { encontrado: false, clientes: [], cliente: null, termoBuscado: termo, ultimosDigitos, sqlExecutado: sql };
      }

      const clientes = rows.map((r: any) => ({
        codParc: Number(r.CODPARC),
        nomeParc: String(r.NOMEPARC || r.RAZAOSOCIAL || ''),
        razaoSocial: String(r.RAZAOSOCIAL || ''),
        cnpjCpf: String(r.CGC_CPF || ''),
        telefone: String(r.TELEFONE || termo),
        email: r.EMAIL ? String(r.EMAIL) : null,
        tipoPessoa: String(r.TIPPESSOA || 'J'),
        limiteCredito: r.LIMCRED ? Number(r.LIMCRED) : 0,
        situacao: r.SITUACAO ? String(r.SITUACAO) : null,
      }));

      return {
        encontrado: true,
        total: clientes.length,
        cliente: clientes[0], // Primeiro/principal como atalho
        clientes,
        termoBuscado: termo,
        ultimosDigitos,
      };
    } catch (error: any) {
      console.error(`[WhatsApp Backend] Erro na consulta Sankhya:`, error);
      return { encontrado: false, clientes: [], cliente: null, erro: error?.message, termoBuscado: termo, ultimosDigitos };
    }
  }

  /**
   * Busca títulos em aberto para o telefone ou parceiroId fornecido
   */
  @Public()
  @Get('titulos-por-telefone')
  async buscarTitulosPorTelefone(
    @Query('telefone') telefone?: string,
    @Query('parceiroId') parceiroId?: string,
  ) {
    console.log(`[WhatsApp Backend] GET titulos-por-telefone chamado. Telefone: "${telefone}", ParceiroId: "${parceiroId}"`);
    let clientesEncontrados: any[] = [];
    let clientePrincipal: any = null;

    if (parceiroId) {
      try {
        const idNum = parseInt(parceiroId, 10);
        if (!isNaN(idNum)) {
          const clienteSankhya = await this.clienteUseCases.buscarPorId(idNum);
          if (clienteSankhya) {
            clientePrincipal = {
              codParc: clienteSankhya.codParc,
              nomeParc: clienteSankhya.nomeParc,
              razaoSocial: clienteSankhya.razaoSocial || clienteSankhya.nomeParc,
              cnpjCpf: clienteSankhya.cnpjCpf,
              telefone: clienteSankhya.telefone || telefone || '',
              email: clienteSankhya.email || null,
              tipoPessoa: clienteSankhya.tipoPessoa || 'J',
              limiteCredito: clienteSankhya.limiteCredito || 0,
              situacao: clienteSankhya.situacao || 'A',
            };
            clientesEncontrados = [clientePrincipal];
          }
        }
      } catch (err) {
        // Fallback para busca por telefone se houver erro no ID
      }
    }

    let debugBuscaTelefone: any = null;
    if (!clientePrincipal && telefone) {
      const resBusca = await this.buscarClientePorTelefone(telefone);
      debugBuscaTelefone = resBusca;
      if (resBusca.encontrado && resBusca.clientes && resBusca.clientes.length > 0) {
        clientesEncontrados = resBusca.clientes;
        clientePrincipal = resBusca.clientes[0];
      }
    }

    if (!clientePrincipal) {
      return {
        cliente: null,
        clientes: [],
        titulos: [],
        totalEmAberto: 0,
        buscaParams: { telefone, parceiroId },
        debugBuscaTelefone,
      };
    }

    const codParc = clientePrincipal.codParc;
    const titulos = await this.tituloUseCases.buscarPorCliente(codParc);

    const titulosAbertos = titulos.filter(
      (t) => (t.valorEmAberto || 0) > 0 && t.status !== StatusTitulo.PAGO && t.status !== StatusTitulo.BAIXADO
    );

    const totalEmAberto = titulosAbertos.reduce((sum, t) => sum + (t.valorEmAberto || 0), 0);

    return {
      cliente: clientePrincipal,
      clientes: clientesEncontrados,
      titulos: titulosAbertos,
      totalEmAberto,
      buscaParams: { telefone, parceiroId },
      debugBuscaTelefone,
    };
  }

  /**
   * Registrar envio de mensagem/cobrança via WhatsApp no histórico do Sankhya e encerrar atendimento
   */
  @Public()
  @Post('registrar-historico')
  async registrarHistorico(
    @Req() req: any,
    @Body()
    body: {
      parceiroId?: number;
      mensagem: string;
      nuFin?: number;
      proximaChamada?: string;
    },
  ) {
    if (!body || !body.mensagem) {
      return { success: false, message: 'Mensagem não informada' };
    }

    // Se for mensagem para contato avulso sem cadastro de parceiro no Sankhya
    if (!body.parceiroId) {
      return { success: true, avulso: true };
    }

    const usuarioLogado = req.user;
    const proximaData = body.proximaChamada ? new Date(body.proximaChamada) : null;

    const msgLimpa = (body.mensagem || '').trim();
    const dto = {
      parceiroId: body.parceiroId,
      tipo: TipoContato.WHATSAPP,
      historico: `[WHATSAPP WEB] ${msgLimpa.substring(0, 250)}`,
      comentarios: `[WHATSAPP WEB] ${msgLimpa}`.substring(0, 290),
      mensagem: msgLimpa.substring(0, 290),
      situacao: SituacaoContato.CONCLUIDO,
      pendente: false,
      proximaChamada: proximaData,
      nuFin: body.nuFin || null,
    };

    const contatoCriado = await this.contatoUseCases.criarContato(dto, usuarioLogado);
    return { success: true, contato: contatoCriado };
  }
}
