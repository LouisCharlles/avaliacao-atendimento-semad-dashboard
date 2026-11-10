import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { COOKIE_SESSAO, emitirToken, exigirSessao, opcoesCookie } from '../middleware/auth.js';
import { PERFIS } from '../domain.js';

export const authRouter = Router();

// Hash fictício para igualar o tempo de resposta quando o usuário não existe.
const HASH_FALSO = bcrypt.hashSync('usuario-inexistente', 10);

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { erro: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.' },
});

const loginSchema = z.object({
  usuario: z.string().trim().min(1).max(50),
  senha: z.string().min(1).max(200),
});

// bcrypt considera só os primeiros 72 bytes da senha; acima disso o resto seria ignorado em silêncio.
const novaSenhaSchema = z
  .string()
  .min(10, 'A nova senha deve ter pelo menos 10 caracteres.')
  .refine((s) => Buffer.byteLength(s, 'utf8') <= 72, 'A nova senha deve ter no máximo 72 caracteres.');

const trocarSenhaSchema = z.object({
  usuario: z.string().trim().min(1).max(50),
  senhaAtual: z.string().min(1).max(200),
  novaSenha: novaSenhaSchema,
});

function publico(u) {
  return { usuario: u.usuario, nome: u.nome, perfil: u.perfil, perfilRotulo: PERFIS[u.perfil] };
}

authRouter.post('/login', limiteLogin, async (req, res, next) => {
  try {
    const dados = loginSchema.safeParse(req.body);
    if (!dados.success) return res.status(400).json({ erro: 'Informe usuário e senha.' });
    const { usuario, senha } = dados.data;

    const { rows } = await query(
      'SELECT id, usuario, nome, perfil, senha_hash FROM usuarios WHERE usuario = $1 AND ativo',
      [usuario.toLowerCase()],
    );
    const u = rows[0];
    const ok = await bcrypt.compare(senha, u?.senha_hash ?? HASH_FALSO);

    await query('INSERT INTO auditoria_login (usuario, sucesso, ip) VALUES ($1, $2, $3)', [
      usuario.slice(0, 50),
      Boolean(u && ok),
      req.ip,
    ]);

    if (!u || !ok) return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });

    await query('UPDATE usuarios SET ultimo_login_em = now() WHERE id = $1', [u.id]);
    res.cookie(COOKIE_SESSAO, emitirToken(u), opcoesCookie());
    return res.json({ usuario: publico(u) });
  } catch (err) {
    return next(err);
  }
});

// Troca de senha feita pela tela de login: exige usuário + senha atual.
// Usa o mesmo limitador do login (contador compartilhado por IP), para não dobrar as tentativas
// de adivinhar a senha, e registra a verificação na auditoria como uma tentativa de autenticação.
authRouter.post('/trocar-senha', limiteLogin, async (req, res, next) => {
  try {
    const dados = trocarSenhaSchema.safeParse(req.body);
    if (!dados.success) {
      const problemaNova = dados.error.issues.find((i) => i.path[0] === 'novaSenha');
      return res.status(400).json({ erro: problemaNova?.message ?? 'Preencha todos os campos.' });
    }
    const { usuario, senhaAtual, novaSenha } = dados.data;

    const { rows } = await query('SELECT id, senha_hash FROM usuarios WHERE usuario = $1 AND ativo', [
      usuario.toLowerCase(),
    ]);
    const u = rows[0];
    const ok = await bcrypt.compare(senhaAtual, u?.senha_hash ?? HASH_FALSO);

    await query('INSERT INTO auditoria_login (usuario, sucesso, ip) VALUES ($1, $2, $3)', [
      usuario.slice(0, 50),
      Boolean(u && ok),
      req.ip,
    ]);

    if (!u || !ok) return res.status(401).json({ erro: 'Usuário ou senha atual inválidos.' });
    if (novaSenha === senhaAtual) {
      return res.status(400).json({ erro: 'A nova senha deve ser diferente da senha atual.' });
    }

    const hash = await bcrypt.hash(novaSenha, config.bcryptCusto);
    await query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [hash, u.id]);
    res.clearCookie(COOKIE_SESSAO, { path: '/' });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_SESSAO, { path: '/' });
  res.status(204).end();
});

authRouter.get('/me', exigirSessao, (req, res) => {
  res.json({ usuario: publico(req.usuario) });
});
