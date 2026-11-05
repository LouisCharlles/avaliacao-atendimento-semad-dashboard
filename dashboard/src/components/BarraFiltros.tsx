import { useEffect, useRef, useState } from 'react';
import type { Filtros } from '../lib/tipos';
import { SETORES } from '../lib/dominio';
import { hojeIso, somarDias } from '../lib/formato';

export type Preset = 'hoje' | '7d' | '30d' | 'mes' | 'mes-anterior' | '90d' | 'personalizado';

const PRESETS: { id: Preset; rotulo: string }[] = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: '7d', rotulo: '7 dias' },
  { id: '30d', rotulo: '30 dias' },
  { id: '90d', rotulo: '90 dias' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes-anterior', rotulo: 'Mês anterior' },
  { id: 'personalizado', rotulo: 'Personalizado' },
];

export function intervaloDoPreset(p: Preset): { inicio: string; fim: string } | null {
  const hoje = hojeIso();
  switch (p) {
    case 'hoje':
      return { inicio: hoje, fim: hoje };
    case '7d':
      return { inicio: somarDias(hoje, -6), fim: hoje };
    case '30d':
      return { inicio: somarDias(hoje, -29), fim: hoje };
    case '90d':
      return { inicio: somarDias(hoje, -89), fim: hoje };
    case 'mes':
      return { inicio: `${hoje.slice(0, 8)}01`, fim: hoje };
    case 'mes-anterior': {
      const fim = somarDias(`${hoje.slice(0, 8)}01`, -1);
      return { inicio: `${fim.slice(0, 8)}01`, fim };
    }
    default:
      return null;
  }
}

interface Props {
  filtros: Filtros;
  preset: Preset;
  onChange: (f: Filtros, p: Preset) => void;
  exportar: React.ReactNode;
}

export default function BarraFiltros({ filtros, preset, onChange, exportar }: Props) {
  return (
    <div className="filtros" data-export-ignorar>
      <div className="segmentado" role="group" aria-label="Período">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            aria-pressed={preset === p.id}
            onClick={() => {
              const i = intervaloDoPreset(p.id);
              onChange(i ? { ...filtros, ...i } : filtros, p.id);
            }}
          >
            {p.rotulo}
          </button>
        ))}
      </div>

      {preset === 'personalizado' && (
        <div className="datas">
          <label className="sr-only" htmlFor="inicio">Data inicial</label>
          <input
            id="inicio"
            type="date"
            value={filtros.inicio}
            max={filtros.fim}
            onChange={(e) => e.target.value && onChange({ ...filtros, inicio: e.target.value }, 'personalizado')}
          />
          <span>até</span>
          <label className="sr-only" htmlFor="fim">Data final</label>
          <input
            id="fim"
            type="date"
            value={filtros.fim}
            min={filtros.inicio}
            max={hojeIso()}
            onChange={(e) => e.target.value && onChange({ ...filtros, fim: e.target.value }, 'personalizado')}
          />
        </div>
      )}

      <label className="sr-only" htmlFor="setor">Setor responsável</label>
      <select
        id="setor"
        className="select"
        value={filtros.setor ?? ''}
        onChange={(e) => onChange({ ...filtros, setor: e.target.value || null }, preset)}
      >
        <option value="">Todos os setores</option>
        {SETORES.map((s) => (
          <option key={s.sigla} value={s.sigla}>
            {s.sigla} — {s.nome}
          </option>
        ))}
      </select>

      <div className="filtros__espaco" />
      {exportar}
    </div>
  );
}

export function MenuExportar({ onExcel, onPdf, ocupado }: { onExcel: () => void; onPdf: () => void; ocupado: string | null }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    document.addEventListener('keydown', fechar);
    return () => {
      document.removeEventListener('mousedown', fechar);
      document.removeEventListener('keydown', fechar);
    };
  }, [aberto]);

  return (
    <div className="menu" ref={ref}>
      <button className="btn btn--primario" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((a) => !a)} disabled={!!ocupado}>
        {ocupado ?? 'Exportar'} <span aria-hidden>▾</span>
      </button>
      {aberto && (
        <div className="menu__lista" role="menu">
          <button role="menuitem" onClick={() => { setAberto(false); onPdf(); }}>
            <span className="menu__icone" style={{ background: '#c0302f' }}>PDF</span>
            <span>
              <strong>Relatório em PDF</strong>
              <span>Dashboard com gráficos, tabelas e comentários</span>
            </span>
          </button>
          <button role="menuitem" onClick={() => { setAberto(false); onExcel(); }}>
            <span className="menu__icone" style={{ background: '#1d7044' }}>XLS</span>
            <span>
              <strong>Planilha Excel</strong>
              <span>Resumo, por pergunta, por setor e todas as respostas</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
