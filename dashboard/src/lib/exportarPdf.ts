import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toJpeg } from 'html-to-image';
import type { Painel, Usuario } from './tipos';
import { NOME_SETOR, ROTULO_RESOLUCAO } from './dominio';
import { dataBr, dataHoraBr, decimal1, nota, numero, pct } from './formato';
import logoBrancoUrl from '../assets/logos/semad-branco-horizontal.png';

const AZUL: [number, number, number] = [16, 72, 115];
const TINTA: [number, number, number] = [15, 27, 42];
const TINTA2: [number, number, number] = [74, 85, 102];
const MARGEM = 14;

async function carregarImagem(url: string): Promise<{ data: string; w: number; h: number }> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return { data: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight };
}

/** Remove caracteres fora do Latin-1 (emojis etc.), que as fontes padrão do PDF não suportam. */
const latin1 = (s: string) => s.replace(/[^\u0000-ÿ]/gu, '').replace(/\s{2,}/g, ' ').trim();
const semValor = (s: string) => (s === '—' ? '-' : s);

export async function exportarPdf(painel: Painel, usuario: Usuario, raiz: HTMLElement) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const L = doc.internal.pageSize.getWidth();
  const A = doc.internal.pageSize.getHeight();
  const largura = L - MARGEM * 2;
  const logo = await carregarImagem(logoBrancoUrl);

  const { filtros, indicadores: ind } = painel;
  const setorTxt = filtros.setor ? `${filtros.setor} - ${NOME_SETOR[filtros.setor]}` : 'Todos os setores';

  // ---------- Cabeçalho ----------
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, L, 26, 'F');
  const hLogo = 11;
  doc.addImage(logo.data, 'PNG', MARGEM, 7.5, (logo.w / logo.h) * hLogo, hLogo);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Relatório de Avaliação do Atendimento', L - MARGEM, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Central de Atendimento ao Servidor (CEAT) e setores da SEMAD', L - MARGEM, 17.5, { align: 'right' });
  // Faixa colorida da marca
  const cores: [number, number, number][] = [[246, 195, 59], [156, 194, 74], [43, 179, 163], [47, 143, 216]];
  cores.forEach((c, i) => {
    doc.setFillColor(...c);
    doc.rect((L / 4) * i, 26, L / 4 + 0.2, 1.2, 'F');
  });

  let y = 35;
  doc.setTextColor(...TINTA2);
  doc.setFontSize(9);
  doc.text(`Período: ${dataBr(filtros.inicio)} a ${dataBr(filtros.fim)}   |   Setor: ${setorTxt}`, MARGEM, y);
  y += 5;
  doc.text(`Gerado por ${usuario.nome} (${usuario.perfilRotulo}) em ${dataHoraBr(new Date().toISOString())}`, MARGEM, y);
  y += 7;

  // ---------- Indicadores ----------
  const kpis: [string, string][] = [
    ['Satisfação geral', ind.satisfacaoGeral === null ? '-' : `${decimal1(ind.satisfacaoGeral)}%`],
    ['Avaliações', numero(ind.total)],
    ['Nota média CEAT', `${semValor(nota(ind.mediaCeat))} / 5`],
    ['Resolvidas totalmente', semValor(pct(ind.resolvidasTotal))],
    ['Comentários', numero(ind.comentarios)],
  ];
  const gap = 3;
  const wk = (largura - gap * (kpis.length - 1)) / kpis.length;
  kpis.forEach(([rotulo, valor], i) => {
    const x = MARGEM + i * (wk + gap);
    if (i === 0) doc.setFillColor(...AZUL);
    else doc.setFillColor(243, 245, 248);
    doc.roundedRect(x, y, wk, 20, 2, 2, 'F');
    doc.setTextColor(...(i === 0 ? ([255, 255, 255] as [number, number, number]) : TINTA2));
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(rotulo, x + 3.5, y + 6);
    doc.setTextColor(...(i === 0 ? ([255, 255, 255] as [number, number, number]) : TINTA));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(valor, x + 3.5, y + 15);
  });
  y += 27;

  // ---------- Gráficos (capturados da tela) ----------
  // Reflui o painel numa largura fixa e em coluna única, para todos os gráficos saírem na mesma escala.
  raiz.classList.add('exportando');
  await new Promise((r) => setTimeout(r, 450));
  const graficos = Array.from(raiz.querySelectorAll<HTMLElement>('[data-export]'));
  try {
  for (const el of graficos) {
    // JPEG mantém o PDF leve (alguns MB no máximo) com boa nitidez.
    const png = await toJpeg(el, {
      quality: 0.9,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      filter: (n) => !(n instanceof HTMLElement && n.dataset.exportIgnorar !== undefined),
    });
    const img = new Image();
    img.src = png;
    await img.decode();
    let w = largura;
    let h = (img.height / img.width) * w;
    const maxH = A - 30;
    if (h > maxH) {
      h = maxH;
      w = (img.width / img.height) * h;
    }
    if (y + h > A - 16) {
      doc.addPage();
      y = 16;
    }
    doc.addImage(png, 'JPEG', MARGEM + (largura - w) / 2, y, w, h);
    y += h + 6;
  }
  } finally {
    raiz.classList.remove('exportando');
  }

  // ---------- Tabelas ----------
  const estiloTabela = {
    styles: { fontSize: 8, cellPadding: 1.8, textColor: TINTA, lineColor: [227, 231, 237] as [number, number, number], lineWidth: 0.1 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold' as const },
    alternateRowStyles: { fillColor: [247, 248, 250] as [number, number, number] },
    margin: { left: MARGEM, right: MARGEM, top: 16, bottom: 16 },
  };

  const tituloSecao = (t: string) => {
    if (y > A - 40) {
      doc.addPage();
      y = 16;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...TINTA);
    doc.text(t, MARGEM, y);
    y += 3;
  };
  const posTabela = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;

  tituloSecao('Distribuição das respostas por pergunta');
  autoTable(doc, {
    ...estiloTabela,
    startY: y,
    head: [['Pergunta', 'Excelente / Muito satisf.', 'Bom / Satisf.', 'Regular', 'Ruim / Insatisf.', 'Péssimo / Muito insatisf.', 'Média', 'Satisfação']],
    body: painel.perguntas.map((p) => [
      `${p.id.toUpperCase()} - ${p.curto}`,
      ...p.distribuicao.map((o) => `${o.quantidade} (${semValor(pct(o.percentual))})`),
      semValor(nota(p.media)),
      semValor(pct(p.satisfacao)),
    ]),
    columnStyles: { 0: { cellWidth: 38 } },
  });
  y = posTabela();

  tituloSecao('Q5 - A demanda foi solucionada ou encaminhada?');
  autoTable(doc, {
    ...estiloTabela,
    startY: y,
    head: [['Resposta', 'Quantidade', '% do total']],
    body: painel.resolucao.opcoes.map((o) => [o.rotulo, numero(o.quantidade), semValor(pct(o.percentual))]),
  });
  y = posTabela();

  tituloSecao('Desempenho por setor responsável');
  autoTable(doc, {
    ...estiloTabela,
    startY: y,
    head: [['Sigla', 'Setor', 'Aval.', 'Cordial.', 'Clareza', 'Tempo', 'Satisfação', 'Resolvidas']],
    body: [...painel.porSetor]
      .sort((a, b) => b.total - a.total)
      .map((s) => [
        s.sigla,
        s.nome,
        numero(s.total),
        semValor(nota(s.mediaCordialidade)),
        semValor(nota(s.mediaClareza)),
        semValor(nota(s.mediaTempo)),
        semValor(pct(s.satisfacao)),
        semValor(pct(s.resolvidasTotal)),
      ]),
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 16 }, 1: { cellWidth: 62 } },
  });
  y = posTabela();

  if (painel.comentarios.length) {
    tituloSecao(`Comentários (${painel.comentarios.length} mais recentes)`);
    autoTable(doc, {
      ...estiloTabela,
      startY: y,
      head: [['Data/hora', 'Setor', 'Notas Q1-Q4', 'Q5', 'Comentário']],
      body: painel.comentarios.map((c) => [
        dataHoraBr(c.respondidoEm),
        c.setor,
        `${c.q1} / ${c.q2} / ${c.q3} / ${c.q4}`,
        ROTULO_RESOLUCAO[c.q5],
        latin1(c.comentario),
      ]),
      columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 16 }, 2: { cellWidth: 22 }, 3: { cellWidth: 24 } },
    });
  }

  // ---------- Rodapé em todas as páginas ----------
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(227, 231, 237);
    doc.line(MARGEM, A - 11, L - MARGEM, A - 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TINTA2);
    doc.text('SEMAD - Prefeitura de São Luís  |  Central de Atendimento: +55 (98) 9136-4561', MARGEM, A - 6.5);
    doc.text(`Página ${i} de ${total}`, L - MARGEM, A - 6.5, { align: 'right' });
  }

  const nome = `relatorio-avaliacao_${filtros.inicio}_a_${filtros.fim}${filtros.setor ? `_${filtros.setor}` : ''}.pdf`;
  doc.save(nome);
}
