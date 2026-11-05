// Mantenha sincronizado com api/src/domain.js e com src/domain.ts do projeto do totem (avaliacao-semad-totem).

export const SETORES = [
  { sigla: 'ASJUR', nome: 'Assessoria Jurídica' },
  { sigla: 'ASRES', nome: 'Assessoria de Relações Sindicais' },
  { sigla: 'CEAT', nome: 'Central de Atendimento' },
  { sigla: 'COAD', nome: 'Coordenação de Avaliação de Desempenho' },
  { sigla: 'COAP', nome: 'Coordenação de Análise de Processos' },
  { sigla: 'COAT', nome: 'Coordenação de Arquivo Público Técnico' },
  { sigla: 'COCS', nome: 'Coordenação de Cargos e Salários' },
  { sigla: 'CODF', nome: 'Coordenação de Registro e Documentação Funcional' },
  { sigla: 'CODFAF', nome: 'Coordenação de Arquivo Funcional' },
  { sigla: 'COEC', nome: 'Coordenação de Consignações' },
  { sigla: 'COES', nome: 'Coordenação de Encargos Sociais' },
  { sigla: 'COEST', nome: 'Coordenação de Estágio' },
  { sigla: 'COFP', nome: 'Coordenação de Folha de Pagamento' },
  { sigla: 'GAB', nome: 'Gabinete' },
  { sigla: 'SAP', nome: 'Superintendência da Área de Administração de Pessoas' },
  { sigla: 'SRD', nome: 'Superintendência da Área de Registro e Documentação' },
  { sigla: 'SSM', nome: 'Superintendência da Área de Segurança no Trabalho e Medicina Funcional' },
] as const;

export const NOME_SETOR: Record<string, string> = Object.fromEntries(SETORES.map((s) => [s.sigla, s.nome]));

/**
 * Escala divergente (5 = melhor … 1 = pior): dois polos (azul ↔ vermelho) com
 * ponto neutro cinza em "Regular". Validada para daltonismo (ΔE adjacente ≥ 15);
 * os tons claros têm contraste < 3:1, por isso os gráficos usam rótulos diretos e tabela.
 */
export const COR_ESCALA: Record<number, string> = {
  5: '#184f95',
  4: '#5598e7',
  3: '#d9d7cf',
  2: '#f0875a',
  1: '#c0302f',
};

/** Cor do texto dentro de cada segmento (garante contraste). */
export const TINTA_ESCALA: Record<number, string> = {
  5: '#ffffff',
  4: '#0b0b0b',
  3: '#0b0b0b',
  2: '#0b0b0b',
  1: '#ffffff',
};

export const COR_RESOLUCAO: Record<string, string> = {
  total: '#184f95',
  parcial: '#5598e7',
  andamento: '#d9d7cf',
  nao: '#c0302f',
};

export const EMOJI_NOTA: Record<number, string> = { 5: '😄', 4: '🙂', 3: '😐', 2: '🙁', 1: '😠' };
export const EMOJI_RESOLUCAO: Record<string, string> = { total: '😄', parcial: '🙂', nao: '🙁', andamento: '⏳' };
export const ROTULO_RESOLUCAO: Record<string, string> = {
  total: 'Sim, totalmente',
  parcial: 'Sim, parcialmente',
  nao: 'Não',
  andamento: 'Em andamento',
};

export const ROTULO_QUALIDADE: Record<number, string> = { 5: 'Excelente', 4: 'Bom', 3: 'Regular', 2: 'Ruim', 1: 'Péssimo' };
export const ROTULO_SATISFACAO: Record<number, string> = {
  5: 'Muito satisfatório',
  4: 'Satisfatório',
  3: 'Regular',
  2: 'Insatisfatório',
  1: 'Muito insatisfatório',
};
