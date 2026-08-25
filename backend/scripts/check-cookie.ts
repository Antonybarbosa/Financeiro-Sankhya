import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const g = new SankhyaGateway(new ConfigService());
  const token = await g.getToken();
  console.log('Token (first 30):', token.slice(0, 30));
  console.log('Auth Cookie:', g.getAuthCookie());

  const jwtParts = token.split('.');
  const payload = JSON.parse(Buffer.from(jwtParts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'));
  console.log('JWT Payload keys:', Object.keys(payload));
  console.log('JWT jsessionId:', payload.jsessionId);
  console.log('JWT jsessionid:', payload.jsessionid);
}

main().catch(console.error);
