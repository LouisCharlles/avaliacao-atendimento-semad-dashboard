// Gera avaliações fictícias para testar o dashboard.
// Uso: npm run seed:demo -- [quantidade=800] [dias=60]
// ATENÇÃO: use apenas em ambiente de homologação/desenvolvimento.
import crypto from 'node:crypto';
import { pool } from '../src/db.js';
import { migrar } from '../src/db/migrate.js';
import { SETORES } from '../src/domain.js';

const quantidade = Number(process.argv[2] ?? 800);
const dias = Number(process.argv[3] ?? 60);

const comentarios = [
  'Fui muito bem atendido, a servidora explicou tudo com paciência.',
  'Demorou bastante para ter retorno do processo.',
  'Atendimento rápido e objetivo. Parabéns à equipe!',
  'Precisei voltar duas vezes porque faltou informação sobre os documentos.',
  'Excelente atendimento na recepção da CEAT.',
  'O setor poderia informar melhor os prazos.',
  'Gostaria que houvesse mais guichês funcionando no horário de pico.',
  'Fui encaminhado corretamente logo na primeira vez.',
  'Atendente muito educada e prestativa.',
  'Ainda aguardo resposta do meu pedido de revisão.',
  'O ambiente é confortável e o atendimento foi cordial.',
  'Informações confusas, cada servidor falou uma coisa diferente.',
];

// Viés de qualidade por setor (positivo = melhor avaliado), para o painel ficar realista.
const vies = Object.fromEntries(SETORES.map((s, i) => [s.sigla, Math.sin(i * 1.7) * 0.9]));
// Peso de procura por setor.
const peso = { CEAT: 6, COFP: 9, CODF: 5, COEC: 6, COES: 4, COAP: 5, SAP: 3, COCS: 3, COAD: 2, CODFAF: 2 };

function sortearSetor() {
  const lista = SETORES.map((s) => [s.sigla, peso[s.sigla] ?? 1]);
  const total = lista.reduce((a, [, p]) => a + p, 0);
  let r = Math.random() * total;
  for (const [sigla, p] of lista) {
    r -= p;
    if (r <= 0) return sigla;
  }
  return lista[0][0];
}

function nota(base) {
  // Distribuição enviesada para notas altas, com ruído.
  const x = base + 3.9 + (Math.random() + Math.random() + Math.random() - 1.5) * 1.6;
  return Math.max(1, Math.min(5, Math.round(x)));
}

function sortearData() {
  for (;;) {
    const d = new Date(Date.now() - Math.random() * dias * 86400000);
    // Considera horário de Brasília/Fortaleza (UTC-3): 8h às 17h, dias úteis.
    const local = new Date(d.getTime() - 3 * 3600000);
    const dow = local.getUTCDay();
    const hora = local.getUTCHours();
    if (dow === 0 || dow === 6) continue;
    if (hora < 8 || hora >= 17) continue;
    if (hora === 12 && Math.random() < 0.6) continue;
    return d;
  }
}

await migrar();
const client = await pool.connect();
try {
  await client.query('BEGIN');
  for (let i = 0; i < quantidade; i += 1) {
    const setor = sortearSetor();
    const b = vies[setor];
    const q1 = nota(0.25);
    const q2 = nota(b);
    const q3 = nota(b - 0.2);
    const q4 = nota(b - 0.6);
    const media = (q2 + q3 + q4) / 3;
    const r = Math.random();
    const q5 = media >= 4 ? (r < 0.8 ? 'total' : r < 0.93 ? 'parcial' : 'andamento')
      : media >= 3 ? (r < 0.4 ? 'total' : r < 0.7 ? 'parcial' : r < 0.85 ? 'andamento' : 'nao')
        : r < 0.15 ? 'parcial' : r < 0.45 ? 'andamento' : 'nao';
    const comentario = Math.random() < 0.18 ? comentarios[Math.floor(Math.random() * comentarios.length)] : null;
    await client.query(
      `INSERT INTO avaliacoes (client_id, totem_id, respondido_em, setor_sigla, q1_ceat, q2_cordialidade,
         q3_clareza, q4_tempo_resposta, q5_resolucao, comentario)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [crypto.randomUUID(), Math.random() < 0.7 ? 'totem-01' : 'totem-02', sortearData(), setor, q1, q2, q3, q4, q5, comentario],
    );
  }
  await client.query('COMMIT');
  console.log(`[seed] ${quantidade} avaliações fictícias inseridas nos últimos ${dias} dias.`);
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
  await pool.end();
}
