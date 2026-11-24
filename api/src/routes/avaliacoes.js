import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db.js';
import { exigirChaveTotem } from '../middleware/auth.js';
import { OPCOES_RESOLUCAO, PERGUNTAS, PERGUNTA_RESOLUCAO, SETORES } from '../domain.js';

export const avaliacoesRouter = Router();

/** Máximo de avaliações aceitas em um POST /lote. O totem envia lotes menores que isso. */
export const TAMANHO_MAXIMO_LOTE = 100;

const MENSAGEM_LIMITE = { erro: 'Muitas requisições. Tente novamente em instantes.' };

/**
 * Proteção por IP, antes da chave do totem: barra abuso e tentativa de adivinhar a chave.
 * É folgada porque vários totens podem sair pelo mesmo IP (NAT da rede da prefeitura).
 */
const limiteIp = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: MENSAGEM_LIMITE,
});

/** Limite por totem (já autenticado), para um totem não consumir a cota dos outros. */
function limitePorTotem(limit) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: 'draft-7', // envia Retry-After no 429; o totem respeita
    legacyHeaders: false,
    message: MENSAGEM_LIMITE,
    keyGenerator: (req) => `totem:${String(req.body?.totemId ?? 'totem-01').trim().slice(0, 50)}`,
  });
}

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

const loteSchema = z.object({
  // Usado no limite por totem e como padrão para itens sem totemId.
  totemId: z.string().trim().min(1).max(50).optional(),
  avaliacoes: z.array(z.unknown()).min(1).max(TAMANHO_MAXIMO_LOTE),
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

/**
 * Grava avaliações já validadas em um único INSERT. Reenvios (client_id já existente, inclusive
 * repetido dentro do mesmo lote) são ignorados. Retorna o conjunto de clientIds gravados agora.
 */
async function inserir(lista) {
  const { rows } = await query(
    `INSERT INTO avaliacoes
       (client_id, totem_id, respondido_em, setor_sigla, q1_ceat, q2_cordialidade, q3_clareza,
        q4_tempo_resposta, q5_resolucao, comentario)
     SELECT * FROM unnest(
       $1::uuid[], $2::varchar[], $3::timestamptz[], $4::varchar[], $5::smallint[], $6::smallint[],
       $7::smallint[], $8::smallint[], $9::varchar[], $10::varchar[]
     )
     ON CONFLICT (client_id) DO NOTHING
     RETURNING client_id`,
    [
      lista.map((a) => a.clientId),
      lista.map((a) => a.totemId),
      lista.map((a) => normalizarData(a.respondidoEm).toISOString()),
      lista.map((a) => a.setor),
      lista.map((a) => a.q1),
      lista.map((a) => a.q2),
      lista.map((a) => a.q3),
      lista.map((a) => a.q4),
      lista.map((a) => a.q5),
      lista.map((a) => a.comentario),
    ],
  );
  return new Set(rows.map((r) => String(r.client_id).toLowerCase()));
}

// Metadados públicos usados pelo totem (perguntas e setores).
avaliacoesRouter.get('/config', (req, res) => {
  res.json({ perguntas: PERGUNTAS, perguntaResolucao: PERGUNTA_RESOLUCAO, setores: SETORES });
});

// Recebe uma avaliação anônima do totem.
avaliacoesRouter.post('/', limiteIp, exigirChaveTotem, limitePorTotem(60), async (req, res, next) => {
  try {
    const dados = avaliacaoSchema.safeParse(req.body);
    if (!dados.success) {
      return res.status(400).json({ erro: 'Avaliação inválida.', detalhes: z.flattenError(dados.error).fieldErrors });
    }
    const gravadas = await inserir([dados.data]);
    const nova = gravadas.size > 0;
    // 201 na primeira vez; 200 quando é um reenvio já registrado (idempotente).
    return res.status(nova ? 201 : 200).json({ ok: true, duplicada: !nova });
  } catch (err) {
    return next(err);
  }
});

/**
 * Recebe várias avaliações da fila offline de uma vez. Cada item é validado sozinho: um item
 * inválido não derruba o lote. A resposta traz o resultado de cada item, na mesma ordem do envio:
 * "aceita" (gravada agora), "duplicada" (já estava gravada) ou "invalida" (o totem deve descartar).
 */
avaliacoesRouter.post('/lote', limiteIp, exigirChaveTotem, limitePorTotem(20), async (req, res, next) => {
  try {
    const lote = loteSchema.safeParse(req.body);
    if (!lote.success) {
      return res.status(400).json({
        erro: `Lote inválido: envie "avaliacoes" com 1 a ${TAMANHO_MAXIMO_LOTE} itens.`,
        detalhes: z.flattenError(lote.error).fieldErrors,
      });
    }
    const { totemId, avaliacoes } = lote.data;

    const itens = avaliacoes.map((bruto) => {
      const obj = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? bruto : {};
      const dados = avaliacaoSchema.safeParse({ totemId, ...obj });
      const clientId = typeof obj.clientId === 'string' ? obj.clientId : null;
      return dados.success ? { clientId, dados: dados.data } : { clientId, erro: z.flattenError(dados.error).fieldErrors };
    });

    const validas = itens.filter((i) => i.dados).map((i) => i.dados);
    const gravadas = validas.length ? await inserir(validas) : new Set();

    const vistos = new Set();
    const resultados = itens.map((i) => {
      if (!i.dados) return { clientId: i.clientId, status: 'invalida', detalhes: i.erro };
      const id = i.dados.clientId.toLowerCase();
      // Um mesmo clientId repetido no lote conta como aceito só na primeira ocorrência.
      const status = gravadas.has(id) && !vistos.has(id) ? 'aceita' : 'duplicada';
      vistos.add(id);
      return { clientId: i.dados.clientId, status };
    });

    return res.json({ ok: true, resultados });
  } catch (err) {
    return next(err);
  }
});
