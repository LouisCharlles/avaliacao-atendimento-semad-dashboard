import { useEffect, useState } from 'react';
import { api } from './lib/api';
import type { Usuario } from './lib/tipos';
import Login from './paginas/Login';
import PainelPagina from './paginas/Painel';

/**
 * Uma única URL: sem sessão mostra o login; com sessão (qualquer um dos dois perfis) mostra o painel.
 */
export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    api
      .sessao()
      .then((r) => setUsuario(r.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setVerificando(false));
  }, []);

  if (verificando) {
    return (
      <div className="carregando">
        <div className="spinner" aria-hidden />
        <span>Verificando sessão…</span>
      </div>
    );
  }

  if (!usuario) return <Login onEntrar={setUsuario} />;

  return (
    <PainelPagina
      usuario={usuario}
      onSair={async () => {
        await api.logout().catch(() => undefined);
        setUsuario(null);
      }}
      onSessaoExpirada={() => setUsuario(null)}
    />
  );
}
