import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  subtitulo?: string;
  acoes?: ReactNode;
  className?: string;
  /** Identificador usado pela exportação em PDF para capturar este gráfico. */
  exportId?: string;
  children: ReactNode;
}

export default function Cartao({ titulo, subtitulo, acoes, className = '', exportId, children }: Props) {
  return (
    <section className={`cartao ${className}`} data-export={exportId} data-titulo={titulo} data-subtitulo={subtitulo}>
      <header className="cartao__topo">
        <div>
          <h2>{titulo}</h2>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        {acoes && <div className="cartao__acoes" data-export-ignorar>{acoes}</div>}
      </header>
      {children}
    </section>
  );
}
