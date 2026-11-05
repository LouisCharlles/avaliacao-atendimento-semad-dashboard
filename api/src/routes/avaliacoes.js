import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db.js';
import { exigirChaveTotem } from '../middleware/auth.js';
import { OPCOES_RESOLUCAO, PERGUNTAS, PERGUNTA_RESOLUCAO, SETORES } from '../domain.js';

export const avaliacoesRouter = Router();

const limiteTotem = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Tente novamente em instantes.' },
});

const nota = z.number().int().min(1).max(5);
const siglas = SETORES.map((s) => s.sigla);

const avaliacaoSchema = z.object({
  clientId: z.uuid(),
  totemId: z.string().trim().min(1).max(50).default('totem-01'),
  respondidoEm: z.iso.datetime({ offset: true }).optional(),
  setor: z.enum(siglas),
  q1: nota,
  q2: nota,
  q3: nota,
  q4: nota,
  q5: z.enum(OPCOES_RESOLUCAO.map((o) => o.valor)),
  comentario: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
});

/** Aceita a data enviada pelo totem (fila offline) dentro de uma janela razoável. */
function normalizarData(iso) {
  if (!iso) return new Date();
  const d = new Date(iso);
  const agora = Date.now();
  const trintaDias = 30 * 24 * 60 * 60 * 1000;
  if (Number.isNaN(d.getTime()) || d.getTime() > agora + 5 * 60 * 1000 || d.getTime() < agora - trintaDias) {
    return new Date();
  }
  return d;
}

// Metadados públicos usados pelo totem (perguntas e setores).
avaliacoesRouter.get('/config', (req, res) => {
  res.json({ perguntas: PERGUNTAS, perguntaResolucao: PERGUNTA_RESOLUCAO, setores: SETORES });
});

// Recebe uma avaliação anônima do totem.
avaliacoesRouter.post('/', limiteTotem, exigirChaveTotem, async (req, res, next) => {
  try {
    const dados = avaliacaoSchema.safeParse(req.body);
    if (!dados.success) {
      return res.status(400).json({ erro: 'Avaliação inválida.', detalhes: z.flattenError(dados.error).fieldErrors });
    }
    const a = dados.data;
    const { rows } = await query(
      `INSERT INTO avaliacoes
         (client_id, totem_id, respondido_em, setor_sigla, q1_ceat, q2_cordialidade, q3_clareza,
          q4_tempo_resposta, q5_resolucao, comentario)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (client_id) DO NOTHING
       RETURNING id`,
      [a.clientId, a.totemId, normalizarData(a.respondidoEm), a.setor, a.q1, a.q2, a.q3, a.q4, a.q5, a.comentario],
    );
    // 201 na primeira vez; 200 quando é um reenvio já registrado (idempotente).
    return res.status(rows.length ? 201 : 200).json({ ok: true, duplicada: rows.length === 0 });
  } catch (err) {
    return next(err);
  }
});
