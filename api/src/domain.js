// Domínio do sistema de avaliação: perguntas, escalas e setores.
// Mantenha sincronizado com dashboard/src/lib/dominio.ts e com src/domain.ts do projeto do totem (avaliacao-semad-totem).

/** Escala de 5 pontos usada nas perguntas 1 a 3 (5 = melhor). */
export const ESCALA_QUALIDADE = [
  { valor: 5, rotulo: 'Excelente', emoji: '😄' },
  { valor: 4, rotulo: 'Bom', emoji: '🙂' },
  { valor: 3, rotulo: 'Regular', emoji: '😐' },
  { valor: 2, rotulo: 'Ruim', emoji: '🙁' },
  { valor: 1, rotulo: 'Péssimo', emoji: '😠' },
];

/** Escala de 5 pontos usada na pergunta 4 (5 = melhor). */
export const ESCALA_SATISFACAO = [
  { valor: 5, rotulo: 'Muito satisfatório', emoji: '😄' },
  { valor: 4, rotulo: 'Satisfatório', emoji: '🙂' },
  { valor: 3, rotulo: 'Regular', emoji: '😐' },
  { valor: 2, rotulo: 'Insatisfatório', emoji: '🙁' },
  { valor: 1, rotulo: 'Muito insatisfatório', emoji: '😠' },
];

/** Opções da pergunta 5 (resolução da demanda). */
export const OPCOES_RESOLUCAO = [
  { valor: 'total', rotulo: 'Sim, totalmente', emoji: '😄' },
  { valor: 'parcial', rotulo: 'Sim, parcialmente', emoji: '🙂' },
  { valor: 'nao', rotulo: 'Não', emoji: '🙁' },
  { valor: 'andamento', rotulo: 'Ainda está em andamento', emoji: '⏳' },
];

export const PERGUNTAS = [
  {
    id: 'q1',
    coluna: 'q1_ceat',
    curto: 'Atendimento da CEAT',
    texto:
      'Como você avalia o atendimento prestado pela Central de Atendimento ao Servidor (CEAT), considerando a cordialidade, a atenção e o correto direcionamento da sua solicitação?',
    escala: ESCALA_QUALIDADE,
  },
  {
    id: 'q2',
    coluna: 'q2_cordialidade',
    curto: 'Cordialidade do setor',
    texto: 'O setor responsável pela sua demanda prestou atendimento de forma cordial e respeitosa?',
    escala: ESCALA_QUALIDADE,
  },
  {
    id: 'q3',
    coluna: 'q3_clareza',
    curto: 'Clareza das informações',
    texto:
      'Como você avalia a clareza das informações e orientações fornecidas pelo setor responsável pela sua solicitação?',
    escala: ESCALA_QUALIDADE,
  },
  {
    id: 'q4',
    coluna: 'q4_tempo_resposta',
    curto: 'Tempo de resposta',
    texto: 'Como você avalia o tempo de resposta do setor responsável pela análise da sua solicitação?',
    escala: ESCALA_SATISFACAO,
  },
];

export const PERGUNTA_RESOLUCAO = {
  id: 'q5',
  coluna: 'q5_resolucao',
  curto: 'Resolução da demanda',
  texto: 'Sua demanda foi solucionada ou recebeu o encaminhamento necessário pelo setor responsável?',
  opcoes: OPCOES_RESOLUCAO,
};

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
];

export const PERFIS = {
  atendimento: 'Atendimento',
  assessoria_tecnica: 'Assessoria Técnica',
};

export function rotuloEscala(pergunta, valor) {
  return pergunta.escala.find((o) => o.valor === valor)?.rotulo ?? String(valor);
}

export function rotuloResolucao(valor) {
  return OPCOES_RESOLUCAO.find((o) => o.valor === valor)?.rotulo ?? valor;
}
