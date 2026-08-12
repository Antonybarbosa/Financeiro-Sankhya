import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../presentation/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('service', 'financeiro-sankhya');
      });
  });

  it('/api/cobranca/dashboard/kpis (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/cobranca/dashboard/kpis')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('totalTitulos');
        expect(res.body).toHaveProperty('totalVencidos');
        expect(res.body).toHaveProperty('totalA_vencer');
        expect(res.body).toHaveProperty('valorEmAberto');
        expect(res.body).toHaveProperty('valorVencido');
      });
  });

  it('/api/cobranca/titulos (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/cobranca/titulos')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(Array.isArray);
  });

  it('/api/cobranca/cobrancas (POST) - Criar cobrança', () => {
    return request(app.getHttpServer())
      .post('/api/cobranca/cobrancas')
      .send({
        tituloId: 1234,
        tipo: 'EMAIL',
        dataAgendamento: new Date().toISOString(),
        mensagem: 'Teste de cobrança',
        destinatario: 'test@example.com'
      })
      .expect(201)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('tituloId', 1234);
        expect(res.body).toHaveProperty('tipo', 'EMAIL');
        expect(res.body).toHaveProperty('status', 'PENDENTE');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});