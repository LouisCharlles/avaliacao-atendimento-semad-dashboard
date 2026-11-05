import type { ReactNode } from 'react';

export const EIXO = { fontSize: 12, fill: '#7a8494' };
export const GRADE = '#eceef2';
export const BASE = '#cdd4de';
export const AZUL_SERIE = '#1c5cab';

export function Dica({ titulo, children, sub }: { titulo: ReactNode; children?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="dica">
      <div className="dica__titulo">{titulo}</div>
      {children}
      {sub && <div className="dica__sub">{sub}</div>}
    </div>
  );
}

export function LinhaDica({ cor, rotulo, valor }: { cor?: string; rotulo: ReactNode; valor: ReactNode }) {
  return (
    <div className="dica__linha">
      {cor && <span className="legenda__amostra" style={{ background: cor }} />}
      <span>{rotulo}</span>
      <span>{valor}</span>
    </div>
  );
}

export function Vazio({ altura = 240 }: { altura?: number }) {
  return (
    <div className="vazio" style={{ minHeight: altura, display: 'grid', placeItems: 'center' }}>
      Nenhuma avaliação no período selecionado.
    </div>
  );
}
