import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const COOKIE_SESSAO = 'semad_sessao';

export function emitirToken(usuario) {
  return jwt.sign(
    { sub: String(usuario.id), usuario: usuario.usuario, nome: usuario.nome, perfil: usuario.perfil },
    config.jwtSecret,
    { expiresIn: config.jwtExpiracao, issuer: 'semad-avaliacao' },
  );
}

export function opcoesCookie() {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  };
}

/** Exige sessão válida (qualquer um dos dois perfis tem as mesmas permissões). */
export function exigirSessao(req, res, next) {
  const token = req.cookies?.[COOKIE_SESSAO];
  if (!token) return res.status(401).json({ erro: 'Sessão não encontrada. Faça login.' });
  try {
    const payload = jwt.verify(token, config.jwtSecret, { issuer: 'semad-avaliacao' });
    req.usuario = {
      id: Number(payload.sub),
      usuario: payload.usuario,
      nome: payload.nome,
      perfil: payload.perfil,
    };
    return next();
  } catch {
    res.clearCookie(COOKIE_SESSAO, { path: '/' });
    return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  }
}

/** Valida a chave do totem enviada no cabeçalho X-Totem-Key (comparação em tempo constante). */
export function exigirChaveTotem(req, res, next) {
  const recebida = Buffer.from(String(req.get('x-totem-key') ?? ''));
  const esperada = Buffer.from(config.totemApiKey);
  if (recebida.length !== esperada.length || !crypto.timingSafeEqual(recebida, esperada)) {
    return res.status(401).json({ erro: 'Totem não autorizado.' });
  }
  return next();
}
