// Redefine a senha de um usuário do painel (o hash bcrypt é gravado no banco).
// Uso: npm run set-password -- <usuario>
// A senha é lida do terminal (não fica no histórico do shell). Para automação,
// defina NEW_PASSWORD no ambiente.
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';
import { config } from '../src/config.js';

const usuario = process.argv[2];
if (!usuario) {
  console.error('Uso: npm run set-password -- <usuario>');
  process.exit(1);
}

async function lerSenha() {
  if (process.env.NEW_PASSWORD) return process.env.NEW_PASSWORD;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    rl.question('Nova senha: ', (s) => {
      rl.close();
      resolve(s);
    });
    rl._writeToOutput = () => {}; // não ecoa a senha
  });
}

const senha = await lerSenha();
if (!senha || senha.length < 10) {
  console.error('\nA senha deve ter pelo menos 10 caracteres.');
  process.exit(1);
}

const hash = await bcrypt.hash(senha, config.bcryptCusto);
const { rowCount } = await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE usuario = $2', [hash, usuario]);
await pool.end();
if (!rowCount) {
  console.error(`\nUsuário "${usuario}" não encontrado.`);
  process.exit(1);
}
console.log(`\nSenha de "${usuario}" atualizada.`);
