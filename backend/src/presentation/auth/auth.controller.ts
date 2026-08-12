import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SankhyaGateway } from '../../infrastructure/sankhya/sankhya.gateway';
import { JwtService } from '@nestjs/jwt';
import { Public } from './public.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly sankhyaGateway: SankhyaGateway,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post('sankhya-login')
  @HttpCode(HttpStatus.OK)
  async sankhyaLogin(@Body() loginDto: { username: string; password: string }) {
    try {
      const requestBody = {
        serviceName: 'MobileLoginSP.login',
        requestBody: {
          NOMUSU: { $: loginDto.username },
          INTERNO: { $: loginDto.password },
        },
      };

      const response = await this.sankhyaGateway.serviceCall(
        'MobileLoginSP.login',
        requestBody,
        'mge',
      );

      if (response.status === '1' && response.responseBody) {
        const rb = response.responseBody as any;
        const codusuBase64: string = rb.idusu?.$ ?? '';
        const callID: string = rb.callID?.$ ?? '';
        const jsessionid: string = rb.jsessionid?.$ ?? '';

        let codusu = 0;
        try {
          codusu = parseInt(Buffer.from(codusuBase64, 'base64').toString('utf8'), 10) || 0;
        } catch {
          codusu = 0;
        }

        const appToken = this.jwtService.sign(
          { codusu, username: loginDto.username } as any,
          { expiresIn: '8h' } as any,
        );

        return {
          success: true,
          data: {
            callID: { $: callID },
            jsessionid: { $: jsessionid },
            idusu: { $: codusuBase64 },
            appToken,
            codusu,
            username: loginDto.username,
          },
        };
      } else {
        return {
          success: false,
          message: response.statusMessage || 'Credenciais inválidas',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Erro ao autenticar com Sankhya',
      };
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    return {
      success: true,
      message: 'Logout realizado com sucesso',
    };
  }

  @Public()
  @Get('validate')
  async validateSession() {
    return {
      valid: true,
    };
  }
}
