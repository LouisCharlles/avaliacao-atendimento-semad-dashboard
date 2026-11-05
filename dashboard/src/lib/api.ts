import type { Filtros, Painel, Usuario } from './tipos';

// Em produção o dashboard é servido pelo nginx na mesma origem da API (/api).
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ErroApi extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

async function requisicao<T>(caminho: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${caminho}`, {
      credentials: 'include',
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ErroApi(0, 'Não foi possível conectar ao servidor.');
  }
  if (res.status === 204) return undefined as T;
  const corpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErroApi(res.status, corpo.erro ?? 'Erro inesperado.');
  return corpo as T;
}

export function paramsFiltros(f: Filtros): string {
  const p = new URLSearchParams({ inicio: f.inicio, fim: f.fim });
  if (f.setor) p.set('setor', f.setor);
  return p.toString();
}

export const api = {
  login: (usuario: string, senha: string) =>
    requisicao<{ usuario: Usuario }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ usuario, senha }) }),
  logout: () => requisicao<void>('/api/auth/logout', { method: 'POST' }),
  sessao: () => requisicao<{ usuario: Usuario }>('/api/auth/me'),
  painel: (f: Filtros) => requisicao<Painel>(`/api/painel?${paramsFiltros(f)}`),

  async baixarExcel(f: Filtros): Promise<void> {
    const res = await fetch(`${BASE}/api/painel/exportar/excel?${paramsFiltros(f)}`, { credentials: 'include' });
    if (!res.ok) {
      const corpo = await res.json().catch(() => ({}));
      throw new ErroApi(res.status, corpo.erro ?? 'Falha ao gerar o Excel.');
    }
    const nome =
      res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'avaliacao-atendimento.xlsx';
    baixarBlob(await res.blob(), nome);
  },
};

export function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
