import { config } from './config.js';
import { criarApp } from './app.js';
import { migrar } from './db/migrate.js';
import { pool } from './db.js';

async function aguardarBanco(tentativas = 20) {
  for (let i = 1; i <= tentativas; i += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (i === tentativas) throw err;
      console.log(`[api] Aguardando o banco de dados (${i}/${tentativas})...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

await aguardarBanco();
await migrar();

const app = criarApp();
const server = app.listen(config.porta, () => {
  console.log(`[api] Rodando na porta ${config.porta} (${config.ambiente}).`);
});

function encerrar() {
  server.close(() => pool.end().then(() => process.exit(0)));
}
process.on('SIGTERM', encerrar);
process.on('SIGINT', encerrar);
