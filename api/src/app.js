import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { pool } from './db.js';
import { authRouter } from './routes/auth.js';
import { avaliacoesRouter } from './routes/avaliacoes.js';
import { painelRouter } from './routes/painel.js';

export function criarApp() {
  const app = express();

  // Atrás do nginx/proxy: confia no primeiro salto para obter o IP real (rate limit e auditoria).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      // O dashboard é servido na mesma origem (nginx). CORS só é necessário em desenvolvimento.
      // O app do totem (React Native) não está sujeito a CORS.
      origin: config.corsOrigens.length ? config.corsOrigens : false,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());

  app.get('/api/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'erro', erro: 'Banco de dados indisponível.' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/avaliacoes', avaliacoesRouter);
  app.use('/api/painel', painelRouter);

  app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
    console.error('[erro]', err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  });

  return app;
}
