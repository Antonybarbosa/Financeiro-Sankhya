import {
  Controller,
  Get,
  Post,
  Body,
  Query,
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
   * Busca um parceiro no Sankhya pelo número de telefone (Formatado ou apenas dígitos).
   */
  @Public()
  @Get('cliente-por-telefone')
  async buscarClientePorTelefone(@Query('telefone') telefone: string) {
    if (!telefone) {
      return { encontrado: false, cliente: null };
    }

    const apenasNumeros = telefone.replace(/\D/g, '');
    if (apenasNumeros.length < 8) {
      return { encontrado: false, cliente: null };
    }

    const ultimosDigitos = apenasNumeros.slice(-8);

    const sql = `
      SELECT TOP 1 
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
      WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(PAR.TELEFONE, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '') LIKE '%${ultimosDigitos}%'
         OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CTT.TELEFONE, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '') LIKE '%${ultimosDigitos}%'
         OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CTT.CELULAR, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '') LIKE '%${ultimosDigitos}%'
      ORDER BY PAR.CODPARC ASC
    `;

    try {
      const rows = await this.sankhyaGateway.executeQuery(sql);
      if (!rows || rows.length === 0) {
        return { encontrado: false, cliente: null };
      }

      const r = rows[0];
      const cliente = {
        codParc: Number(r.CODPARC),
        nomeParc: String(r.NOMEPARC || r.RAZAOSOCIAL || ''),
        razaoSocial: String(r.RAZAOSOCIAL || ''),
        cnpjCpf: String(r.CGC_CPF || ''),
        telefone: String(r.TELEFONE || telefone),
        email: r.EMAIL ? String(r.EMAIL) : null,
        tipoPessoa: String(r.TIPPESSOA || 'J'),
        limiteCredito: r.LIMCRED ? Number(r.LIMCRED) : 0,
        situacao: r.SITUACAO ? String(r.SITUACAO) : null,
      };

      return { encontrado: true, cliente };
    } catch (error: any) {
      return { encontrado: false, cliente: null, erro: error?.message };
    }
  }

  /**
   * Busca títulos em aberto para o telefone fornecido
   */
  @Public()
  @Get('titulos-por-telefone')
  async buscarTitulosPorTelefone(@Query('telefone') telefone: string) {
    if (!telefone) {
      return { cliente: null, titulos: [], totalEmAberto: 0 };
    }

    const resCliente = await this.buscarClientePorTelefone(telefone);
    if (!resCliente.encontrado || !resCliente.cliente) {
      return { cliente: null, titulos: [], totalEmAberto: 0 };
    }

    const parceiroId = resCliente.cliente.codParc;
    const titulos = await this.tituloUseCases.buscarPorCliente(parceiroId);
    
    const titulosAbertos = titulos.filter(
      (t) => (t.valorEmAberto || 0) > 0 && t.status !== StatusTitulo.PAGO && t.status !== StatusTitulo.BAIXADO
    );

    const totalEmAberto = titulosAbertos.reduce((sum, t) => sum + (t.valorEmAberto || 0), 0);

    return {
      cliente: resCliente.cliente,
      titulos: titulosAbertos,
      totalEmAberto,
    };
  }

  /**
   * Registrar envio de mensagem/cobrança via WhatsApp no histórico do Sankhya
   */
  @Public()
  @Post('registrar-historico')
  async registrarHistorico(
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

    const proximaData = body.proximaChamada ? new Date(body.proximaChamada) : null;

    const dto = {
      parceiroId: body.parceiroId,
      tipo: TipoContato.WHATSAPP,
      historico: `[WHATSAPP WEB] ${body.mensagem.substring(0, 300)}...`,
      mensagem: body.mensagem,
      situacao: SituacaoContato.CONCLUIDO,
      pendente: false,
      proximaChamada: proximaData,
      nuFin: body.nuFin || null,
    };

    const contatoCriado = await this.contatoUseCases.criarContato(dto);
    return { success: true, contato: contatoCriado };
  }
}
