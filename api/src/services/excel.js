import ExcelJS from 'exceljs';
import { config } from '../config.js';
import { PERGUNTAS, rotuloEscala, rotuloResolucao } from '../domain.js';

const AZUL = 'FF104873';
const CINZA = 'FFF1F4F8';

function formatarData(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function estilizarCabecalho(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFB0BCCB' } } };
  });
  row.height = 22;
}

function zebrar(sheet, inicioLinha) {
  for (let i = inicioLinha; i <= sheet.rowCount; i += 1) {
    if ((i - inicioLinha) % 2 === 1) {
      sheet.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CINZA } };
      });
    }
  }
}

function adicionarTitulo(sheet, titulo, painel, usuario, colunas) {
  sheet.mergeCells(1, 1, 1, colunas);
  sheet.getCell(1, 1).value = titulo;
  sheet.getCell(1, 1).font = { bold: true, size: 14, color: { argb: AZUL } };
  sheet.mergeCells(2, 1, 2, colunas);
  const setor = painel.filtros.setor ? `Setor: ${painel.filtros.setor}` : 'Todos os setores';
  sheet.getCell(2, 1).value =
    `Período: ${formatarData(painel.filtros.inicio)} a ${formatarData(painel.filtros.fim)} · ${setor} · ` +
    `Gerado por ${usuario.nome} em ${new Date().toLocaleString('pt-BR', { timeZone: config.fusoRelatorio })}`;
  sheet.getCell(2, 1).font = { size: 10, color: { argb: 'FF52514E' } };
  sheet.addRow([]);
}

/**
 * Gera a planilha com o resumo do painel e as respostas individuais.
 * @returns {Promise<Buffer>}
 */
export async function gerarExcel(painel, respostas, usuario) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SEMAD - Prefeitura de São Luís';
  wb.created = new Date();

  // 1) Resumo
  const resumo = wb.addWorksheet('Resumo', { views: [{ showGridLines: false }] });
  adicionarTitulo(resumo, 'Avaliação do Atendimento — Resumo', painel, usuario, 3);
  resumo.columns = [{ width: 42 }, { width: 18 }, { width: 22 }];
  estilizarCabecalho(resumo.addRow(['Indicador', 'Período', 'Período anterior']));
  const ind = painel.indicadores;
  const linhas = [
    ['Total de avaliações', ind.total, ind.totalAnterior],
    ['Índice de satisfação geral (%)', ind.satisfacaoGeral, ind.satisfacaoGeralAnterior],
    ['Nota média da CEAT (1 a 5)', ind.mediaCeat, ind.mediaCeatAnterior],
    ['Demandas resolvidas totalmente (%)', ind.resolvidasTotal, ind.resolvidasTotalAnterior],
    ['Avaliações com comentário', ind.comentarios, null],
  ];
  linhas.forEach((l) => resumo.addRow(l));
  zebrar(resumo, 5);
  resumo.addRow([]);
  resumo.addRow([
    'Índice de satisfação = percentual de respostas "Excelente/Bom" (ou "Muito satisfatório/Satisfatório") nas perguntas 1 a 4.',
  ]).font = { italic: true, size: 9, color: { argb: 'FF52514E' } };

  // 2) Distribuição por pergunta
  const dist = wb.addWorksheet('Por pergunta', { views: [{ showGridLines: false }] });
  adicionarTitulo(dist, 'Distribuição das respostas por pergunta', painel, usuario, 5);
  dist.columns = [{ width: 34 }, { width: 24 }, { width: 14 }, { width: 14 }, { width: 14 }];
  estilizarCabecalho(dist.addRow(['Pergunta', 'Resposta', 'Quantidade', '% do total', 'Média (1–5)']));
  const inicioDist = dist.rowCount + 1;
  for (const p of painel.perguntas) {
    p.distribuicao.forEach((o, i) => {
      dist.addRow([i === 0 ? `${p.id.toUpperCase()} · ${p.curto}` : '', o.rotulo, o.quantidade, o.percentual, i === 0 ? p.media : null]);
    });
  }
  painel.resolucao.opcoes.forEach((o, i) => {
    dist.addRow([i === 0 ? `Q5 · ${painel.resolucao.curto}` : '', o.rotulo, o.quantidade, o.percentual, null]);
  });
  zebrar(dist, inicioDist);

  // 3) Por setor
  const setores = wb.addWorksheet('Por setor', { views: [{ showGridLines: false }] });
  adicionarTitulo(setores, 'Desempenho por setor responsável', painel, usuario, 8);
  setores.columns = [
    { width: 10 }, { width: 58 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 18 },
  ];
  estilizarCabecalho(
    setores.addRow(['Sigla', 'Setor', 'Avaliações', 'Cordialidade', 'Clareza', 'Tempo', 'Satisfação (%)', 'Resolvidas total (%)']),
  );
  const inicioSet = setores.rowCount + 1;
  [...painel.porSetor]
    .sort((a, b) => b.total - a.total)
    .forEach((s) =>
      setores.addRow([s.sigla, s.nome, s.total, s.mediaCordialidade, s.mediaClareza, s.mediaTempo, s.satisfacao, s.resolvidasTotal]),
    );
  zebrar(setores, inicioSet);

  // 4) Evolução diária
  const diaria = wb.addWorksheet('Evolução diária', { views: [{ showGridLines: false }] });
  adicionarTitulo(diaria, 'Evolução diária', painel, usuario, 3);
  diaria.columns = [{ width: 14 }, { width: 14 }, { width: 18 }];
  estilizarCabecalho(diaria.addRow(['Dia', 'Avaliações', 'Satisfação (%)']));
  const inicioDia = diaria.rowCount + 1;
  painel.serieDiaria.forEach((d) => diaria.addRow([formatarData(d.dia), d.total, d.satisfacao]));
  zebrar(diaria, inicioDia);

  // 5) Respostas individuais
  const resp = wb.addWorksheet('Respostas', { views: [{ state: 'frozen', ySplit: 1 }] });
  resp.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Data/hora', key: 'data', width: 18 },
    { header: 'Totem', key: 'totem', width: 12 },
    { header: 'Setor', key: 'setor', width: 10 },
    { header: 'Q1 · CEAT', key: 'q1', width: 14 },
    { header: 'Q2 · Cordialidade', key: 'q2', width: 16 },
    { header: 'Q3 · Clareza', key: 'q3', width: 14 },
    { header: 'Q4 · Tempo de resposta', key: 'q4', width: 22 },
    { header: 'Q5 · Resolução', key: 'q5', width: 24 },
    { header: 'Comentário', key: 'comentario', width: 60 },
  ];
  estilizarCabecalho(resp.getRow(1));
  for (const r of respostas) {
    resp.addRow({
      id: r.id,
      // Hora local do relatório gravada como "hora de parede" (o Excel não tem fuso).
      data: new Date(`${r.respondido_local}Z`),
      totem: r.totem_id,
      setor: r.setor_sigla,
      q1: rotuloEscala(PERGUNTAS[0], r.q1_ceat),
      q2: rotuloEscala(PERGUNTAS[1], r.q2_cordialidade),
      q3: rotuloEscala(PERGUNTAS[2], r.q3_clareza),
      q4: rotuloEscala(PERGUNTAS[3], r.q4_tempo_resposta),
      q5: rotuloResolucao(r.q5_resolucao),
      comentario: r.comentario ?? '',
    });
  }
  resp.getColumn('data').numFmt = 'dd/mm/yyyy hh:mm';
  resp.getColumn('comentario').alignment = { wrapText: true, vertical: 'top' };
  resp.autoFilter = { from: 'A1', to: 'J1' };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
