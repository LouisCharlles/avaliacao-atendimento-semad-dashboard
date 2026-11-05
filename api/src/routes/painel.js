import { Router } from 'express';
import { ZodError } from 'zod';
import { exigirSessao } from '../middleware/auth.js';
import { listarRespostas, obterPainel } from '../services/estatisticas.js';
import { gerarExcel } from '../services/excel.js';

export const painelRouter = Router();

painelRouter.use(exigirSessao);

function tratarFiltroInvalido(err, res, next) {
  if (err instanceof ZodError) return res.status(400).json({ erro: 'Filtros inválidos.' });
  return next(err);
}

// Dados agregados do dashboard.
painelRouter.get('/', async (req, res, next) => {
  try {
    res.json(await obterPainel(req.query));
  } catch (err) {
    tratarFiltroInvalido(err, res, next);
  }
});

// Exportação em Excel (resumo + respostas individuais).
painelRouter.get('/exportar/excel', async (req, res, next) => {
  try {
    const [painel, respostas] = await Promise.all([obterPainel(req.query), listarRespostas(req.query)]);
    const buffer = await gerarExcel(painel, respostas, req.usuario);
    const nome = `avaliacao-atendimento_${painel.filtros.inicio}_a_${painel.filtros.fim}${painel.filtros.setor ? `_${painel.filtros.setor}` : ''}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.send(buffer);
  } catch (err) {
    tratarFiltroInvalido(err, res, next);
  }
});

// Respostas individuais em JSON (usado pela exportação em PDF no dashboard).
painelRouter.get('/respostas', async (req, res, next) => {
  try {
    const rows = await listarRespostas(req.query);
    res.json({ respostas: rows });
  } catch (err) {
    tratarFiltroInvalido(err, res, next);
  }
});
