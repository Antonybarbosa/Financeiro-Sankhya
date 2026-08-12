import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SankhyaModule } from '../../infrastructure/sankhya/sankhya.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

const jwtSecret = process.env.JWT_SECRET || 'financeiro_sankhya_jwt_dev_min_32_chars_trocar_em_prod';

@Module({
  imports: [
    SankhyaModule,
    JwtModule.register({
      global: true,
      secret: jwtSecret,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
