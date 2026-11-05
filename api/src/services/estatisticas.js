import { z } from 'zod';
import { query } from '../db.js';
import { config } from '../config.js';
import { OPCOES_RESOLUCAO, PERGUNTAS, PERGUNTA_RESOLUCAO, SETORES } from '../domain.js';

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const filtrosSchema = z.object({
  inicio: dataIso.optional(),
  fim: dataIso.optional(),
  setor: z.enum(SETORES.map((s) => s.sigla)).optional().or(z.literal('').transform(() => undefined)),
});

function hojeNoFuso() {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: config.fusoRelatorio }).format(new Date());
}

function somarDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diferencaDias(inicio, fim) {
  return Math.round((new Date(`${fim}T12:00:00Z`) - new Date(`${inicio}T12:00:00Z`)) / 86400000);
}

/** Normaliza os filtros: padrão = últimos 30 dias; inverte datas trocadas; limita a 2 anos. */
export function normalizarFiltros(raw) {
  const f = filtrosSchema.parse(raw);
  let fim = f.fim ?? hojeNoFuso();
  let inicio = f.inicio ?? somarDias(fim, -29);
  if (inicio > fim) [inicio, fim] = [fim, inicio];
  if (diferencaDias(inicio, fim) > 731) inicio = somarDias(fim, -731);
  return { inicio, fim, setor: f.setor ?? null };
}

/** Monta o WHERE comum. $1 = fuso, $2 = início, $3 = fim, $4 = setor (opcional). */
function where({ inicio, fim, setor }) {
  const params = [config.fusoRelatorio, inicio, fim];
  let sql = `a.respondido_em >= ($2::date::timestamp AT TIME ZONE $1)
         AND a.respondido_em <  (($3::date + 1)::timestamp AT TIME ZONE $1)`;
  if (setor) {
    params.push(setor);
    sql += ' AND a.setor_sigla = $4';
  }
  return { sql, params };
}

const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null);
const media = (v) => (v === null || v === undefined ? null : Math.round(Number(v) * 100) / 100);

async function resumo(filtros) {
  const w = where(filtros);
  const { rows } = await query(
    `SELECT
       count(*)                                         AS total,
       count(a.comentario)                              AS comentarios,
       avg(a.q1_ceat)                                   AS m1,
       avg(a.q2_cordialidade)                           AS m2,
       avg(a.q3_clareza)                                AS m3,
       avg(a.q4_tempo_resposta)                         AS m4,
       count(*) FILTER (WHERE a.q1_ceat >= 4)           AS s1,
       count(*) FILTER (WHERE a.q2_cordialidade >= 4)   AS s2,
       count(*) FILTER (WHERE a.q3_clareza >= 4)        AS s3,
       count(*) FILTER (WHERE a.q4_tempo_resposta >= 4) AS s4,
       count(*) FILTER (WHERE a.q5_resolucao = 'total')     AS r_total,
       count(*) FILTER (WHERE a.q5_resolucao = 'parcial')   AS r_parcial,
       count(*) FILTER (WHERE a.q5_resolucao = 'nao')       AS r_nao,
       count(*) FILTER (WHERE a.q5_resolucao = 'andamento') AS r_andamento
     FROM avaliacoes a
     WHERE ${w.sql}`,
    w.params,
  );
  return rows[0];
}

export async function obterPainel(rawFiltros) {
  const filtros = normalizarFiltros(rawFiltros);
  const w = where(filtros);

  const dias = diferencaDias(filtros.inicio, filtros.fim) + 1;
  const anterior = {
    inicio: somarDias(filtros.inicio, -dias),
    fim: somarDias(filtros.inicio, -1),
    setor: filtros.setor,
  };

  const [atual, prev, distribuicao, diaria, porHora, porSetor, comentarios] = await Promise.all([
    resumo(filtros),
    resumo(anterior),
    query(
      `SELECT p, v, count(*) AS n FROM (
         SELECT 'q1' AS p, a.q1_ceat AS v FROM avaliacoes a WHERE ${w.sql}
         UNION ALL SELECT 'q2', a.q2_cordialidade FROM avaliacoes a WHERE ${w.sql}
         UNION ALL SELECT 'q3', a.q3_clareza FROM avaliacoes a WHERE ${w.sql}
         UNION ALL SELECT 'q4', a.q4_tempo_resposta FROM avaliacoes a WHERE ${w.sql}
       ) t GROUP BY p, v`,
      w.params,
    ),
    query(
      `WITH dias AS (
         SELECT generate_series($2::date, $3::date, interval '1 day')::date AS dia
       ), dados AS (
         SELECT (a.respondido_em AT TIME ZONE $1)::date AS dia,
                count(*) AS total,
                count(*) FILTER (WHERE a.q1_ceat >= 4) + count(*) FILTER (WHERE a.q2_cordialidade >= 4)
              + count(*) FILTER (WHERE a.q3_clareza >= 4) + count(*) FILTER (WHERE a.q4_tempo_resposta >= 4) AS positivas
         FROM avaliacoes a WHERE ${w.sql}
         GROUP BY 1
       )
       SELECT to_char(d.dia, 'YYYY-MM-DD') AS dia, coalesce(x.total, 0) AS total, coalesce(x.positivas, 0) AS positivas
       FROM dias d LEFT JOIN dados x USING (dia)
       ORDER BY d.dia`,
      w.params,
    ),
    query(
      `SELECT extract(hour FROM a.respondido_em AT TIME ZONE $1)::int AS hora, count(*) AS total
       FROM avaliacoes a WHERE ${w.sql} GROUP BY 1 ORDER BY 1`,
      w.params,
    ),
    query(
      `SELECT s.sigla, s.nome,
              count(a.id) AS total,
              avg(a.q2_cordialidade) AS m2, avg(a.q3_clareza) AS m3, avg(a.q4_tempo_resposta) AS m4,
              count(*) FILTER (WHERE a.q2_cordialidade >= 4) + count(*) FILTER (WHERE a.q3_clareza >= 4)
            + count(*) FILTER (WHERE a.q4_tempo_resposta >= 4) AS positivas,
              count(*) FILTER (WHERE a.q5_resolucao = 'total') AS resolvidas
       FROM setores s
       LEFT JOIN avaliacoes a ON a.setor_sigla = s.sigla AND ${w.sql}
       ${filtros.setor ? 'WHERE s.sigla = $4' : ''}
       GROUP BY s.sigla, s.nome, s.ordem
       ORDER BY s.ordem`,
      w.params,
    ),
    query(
      `SELECT a.id, a.respondido_em, a.setor_sigla, a.q1_ceat, a.q2_cordialidade, a.q3_clareza,
              a.q4_tempo_resposta, a.q5_resolucao, a.comentario
       FROM avaliacoes a
       WHERE ${w.sql} AND a.comentario IS NOT NULL
       ORDER BY a.respondido_em DESC
       LIMIT 100`,
      w.params,
    ),
  ]);

  const total = atual.total;
  const positivasGerais = atual.s1 + atual.s2 + atual.s3 + atual.s4;
  const positivasAnt = prev.s1 + prev.s2 + prev.s3 + prev.s4;

  const perguntas = PERGUNTAS.map((p, i) => {
    const contagens = Object.fromEntries(p.escala.map((o) => [o.valor, 0]));
    for (const r of distribuicao.rows) if (r.p === p.id) contagens[r.v] = r.n;
    return {
      id: p.id,
      curto: p.curto,
      texto: p.texto,
      media: media(atual[`m${i + 1}`]),
      satisfacao: pct(atual[`s${i + 1}`], total),
      distribuicao: p.escala.map((o) => ({
        valor: o.valor,
        rotulo: o.rotulo,
        emoji: o.emoji,
        quantidade: contagens[o.valor],
        percentual: pct(contagens[o.valor], total),
      })),
    };
  });

  const resolucao = OPCOES_RESOLUCAO.map((o) => ({
    valor: o.valor,
    rotulo: o.rotulo,
    emoji: o.emoji,
    quantidade: atual[`r_${o.valor}`],
    percentual: pct(atual[`r_${o.valor}`], total),
  }));

  return {
    filtros,
    periodoAnterior: anterior,
    geradoEm: new Date().toISOString(),
    indicadores: {
      total,
      totalAnterior: prev.total,
      satisfacaoGeral: pct(positivasGerais, total * 4),
      satisfacaoGeralAnterior: pct(positivasAnt, prev.total * 4),
      mediaCeat: media(atual.m1),
      mediaCeatAnterior: media(prev.m1),
      resolvidasTotal: pct(atual.r_total, total),
      resolvidasTotalAnterior: pct(prev.r_total, prev.total),
      comentarios: atual.comentarios,
    },
    perguntas,
    resolucao: { id: PERGUNTA_RESOLUCAO.id, curto: PERGUNTA_RESOLUCAO.curto, texto: PERGUNTA_RESOLUCAO.texto, opcoes: resolucao },
    serieDiaria: diaria.rows.map((r) => ({
      dia: r.dia,
      total: r.total,
      satisfacao: pct(r.positivas, r.total * 4),
    })),
    porHora: Array.from({ length: 24 }, (_, h) => ({
      hora: h,
      total: porHora.rows.find((r) => r.hora === h)?.total ?? 0,
    })),
    porSetor: porSetor.rows.map((r) => ({
      sigla: r.sigla,
      nome: r.nome,
      total: r.total,
      mediaCordialidade: media(r.m2),
      mediaClareza: media(r.m3),
      mediaTempo: media(r.m4),
      satisfacao: pct(r.positivas, r.total * 3),
      resolvidasTotal: pct(r.resolvidas, r.total),
    })),
    comentarios: comentarios.rows.map((r) => ({
      id: r.id,
      respondidoEm: r.respondido_em,
      setor: r.setor_sigla,
      q1: r.q1_ceat,
      q2: r.q2_cordialidade,
      q3: r.q3_clareza,
      q4: r.q4_tempo_resposta,
      q5: r.q5_resolucao,
      comentario: r.comentario,
    })),
  };
}

/** Todas as respostas do período (para exportação). */
export async function listarRespostas(rawFiltros) {
  const filtros = normalizarFiltros(rawFiltros);
  const w = where(filtros);
  const { rows } = await query(
    `SELECT a.id, a.respondido_em,
            to_char(a.respondido_em AT TIME ZONE $1, 'YYYY-MM-DD"T"HH24:MI:SS') AS respondido_local,
            a.totem_id, a.setor_sigla, s.nome AS setor_nome,
            a.q1_ceat, a.q2_cordialidade, a.q3_clareza, a.q4_tempo_resposta, a.q5_resolucao, a.comentario
     FROM avaliacoes a JOIN setores s ON s.sigla = a.setor_sigla
     WHERE ${w.sql}
     ORDER BY a.respondido_em`,
    w.params,
  );
  return rows;
}
