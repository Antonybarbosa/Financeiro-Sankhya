import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { RenegociacaoUseCases } from '../../application/use-cases/renegociacao.use-cases';
import {
  ParcelamentoParams,
  ConfirmarRenegociacaoDto,
  SimulacaoResultado,
  ConfirmacaoResultado,
} from '../../application/dto/renegociacao.dto';

@Controller('api/renegociacao')
export class RenegociacaoController {
  constructor(private readonly renegociacaoUseCases: RenegociacaoUseCases) {}

  @Post('simular')
  @UsePipes(new ValidationPipe({ transform: true }))
  async simular(@Body() params: ParcelamentoParams): Promise<SimulacaoResultado> {
    return this.renegociacaoUseCases.simular(params);
  }

  @Post('confirmar')
  @UsePipes(new ValidationPipe({ transform: true }))
  async confirmar(@Body() dto: ConfirmarRenegociacaoDto): Promise<ConfirmacaoResultado> {
    return this.renegociacaoUseCases.confirmar(dto);
  }
}
