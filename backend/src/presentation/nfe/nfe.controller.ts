import { Controller, Get, Param, Query, ParseIntPipe, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { SankhyaNfeRepository } from '../../infrastructure/repositories/sankhya-nfe.repository';

@Controller('api/nfe')
export class NfeController {
  constructor(private readonly nfeRepository: SankhyaNfeRepository) {}

  @Get(':identificador')
  async getNfeDados(
    @Param('identificador', ParseIntPipe) identificador: number,
    @Query('tipo') tipo?: string,
  ) {
    try {
      if (tipo === 'numnota') {
        return await this.nfeRepository.findDadosByNumNota(identificador);
      }
      return await this.nfeRepository.findDadosByNunota(identificador);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Erro ao buscar NFE',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':identificador/xml')
  async getNfeXml(
    @Param('identificador', ParseIntPipe) identificador: number,
    @Query('tipo') tipo: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const result =
        tipo === 'numnota'
          ? await this.nfeRepository.findXmlByNumNota(identificador)
          : await this.nfeRepository.findXmlByNunota(identificador);

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="nfe-${result.chave || identificador}.xml"`);
      res.send(result.xml);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Erro ao buscar XML',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
