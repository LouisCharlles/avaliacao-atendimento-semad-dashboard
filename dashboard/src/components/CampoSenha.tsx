import { useState } from 'react';

interface Props {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  autoFocus?: boolean;
  ajuda?: string;
}

/** Campo de senha com botão "Mostrar/Ocultar". */
export default function CampoSenha({ id, rotulo, valor, onChange, autoComplete, autoFocus, ajuda }: Props) {
  const [mostrar, setMostrar] = useState(false);
  const idAjuda = ajuda ? `${id}-ajuda` : undefined;

  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="senha">
        <input
          id={id}
          type={mostrar ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={idAjuda}
          required
        />
        <button type="button" onClick={() => setMostrar((m) => !m)} aria-pressed={mostrar}>
          {mostrar ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {ajuda && (
        <small id={idAjuda} className="campo__ajuda">
          {ajuda}
        </small>
      )}
    </div>
  );
}
