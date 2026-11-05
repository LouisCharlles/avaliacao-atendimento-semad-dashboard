import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { config } from '../config.js';
import { SETORES } from '../domain.js';

const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));

export async function migrar() {
  const sql = await readFile(schemaPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);

    // Setores (lista fixa): insere ou atualiza o nome/ordem.
    for (const [i, s] of SETORES.entries()) {
      await client.query(
        `INSERT INTO setores (sigla, nome, ordem) VALUES ($1, $2, $3)
         ON CONFLICT (sigla) DO UPDATE SET nome = EXCLUDED.nome, ordem = EXCLUDED.ordem`,
        [s.sigla, s.nome, i],
      );
    }

    // Usuários iniciais: criados só se não existirem (a senha nunca é sobrescrita aqui).
    for (const u of config.usuariosIniciais) {
      const existe = await client.query('SELECT 1 FROM usuarios WHERE usuario = $1', [u.usuario]);
      if (existe.rowCount > 0) continue;
      if (!u.senha) {
        console.warn(
          `[migrate] Usuário "${u.usuario}" não existe e a senha inicial não foi definida no .env — ignorado.`,
        );
        continue;
      }
      const hash = await bcrypt.hash(u.senha, config.bcryptCusto);
      await client.query(
        'INSERT INTO usuarios (usuario, nome, perfil, senha_hash) VALUES ($1, $2, $3, $4)',
        [u.usuario, u.nome, u.perfil, hash],
      );
      console.log(`[migrate] Usuário "${u.usuario}" (${u.perfil}) criado.`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Permite rodar diretamente: `npm run migrate`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrar()
    .then(() => {
      console.log('[migrate] Concluído.');
      return pool.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
