import { Injectable } from '@nestjs/common';
import { SankhyaRenegociacaoRepository } from '../../infrastructure/repositories/sankhya-renegociacao.repository';
import {
  ParcelamentoParams,
  ConfirmarRenegociacaoDto,
  SimulacaoResultado,
  ConfirmacaoResultado,
} from '../dto/renegociacao.dto';

@Injectable()
export class RenegociacaoUseCases {
  constructor(private readonly renegociacaoRepository: SankhyaRenegociacaoRepository) {}

  async simular(params: ParcelamentoParams): Promise<SimulacaoResultado> {
    return this.renegociacaoRepository.simular(params);
  }

  async confirmar(dto: ConfirmarRenegociacaoDto): Promise<ConfirmacaoResultado> {
    return this.renegociacaoRepository.confirmar(dto);
  }
}
