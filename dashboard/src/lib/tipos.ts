export type Perfil = 'atendimento' | 'assessoria_tecnica';

export interface Usuario {
  usuario: string;
  nome: string;
  perfil: Perfil;
  perfilRotulo: string;
}

export interface Filtros {
  inicio: string;
  fim: string;
  setor: string | null;
}

export interface OpcaoDistribuicao {
  valor: number;
  rotulo: string;
  emoji: string;
  quantidade: number;
  percentual: number | null;
}

export interface PerguntaResumo {
  id: string;
  curto: string;
  texto: string;
  media: number | null;
  satisfacao: number | null;
  distribuicao: OpcaoDistribuicao[];
}

export interface OpcaoResolucao {
  valor: 'total' | 'parcial' | 'nao' | 'andamento';
  rotulo: string;
  emoji: string;
  quantidade: number;
  percentual: number | null;
}

export interface SetorResumo {
  sigla: string;
  nome: string;
  total: number;
  mediaCordialidade: number | null;
  mediaClareza: number | null;
  mediaTempo: number | null;
  satisfacao: number | null;
  resolvidasTotal: number | null;
}

export interface Comentario {
  id: number;
  respondidoEm: string;
  setor: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: OpcaoResolucao['valor'];
  comentario: string;
}

export interface Painel {
  filtros: Filtros;
  periodoAnterior: Filtros;
  geradoEm: string;
  indicadores: {
    total: number;
    totalAnterior: number;
    satisfacaoGeral: number | null;
    satisfacaoGeralAnterior: number | null;
    mediaCeat: number | null;
    mediaCeatAnterior: number | null;
    resolvidasTotal: number | null;
    resolvidasTotalAnterior: number | null;
    comentarios: number;
  };
  perguntas: PerguntaResumo[];
  resolucao: { id: string; curto: string; texto: string; opcoes: OpcaoResolucao[] };
  serieDiaria: { dia: string; total: number; satisfacao: number | null }[];
  porHora: { hora: number; total: number }[];
  porSetor: SetorResumo[];
  comentarios: Comentario[];
}
