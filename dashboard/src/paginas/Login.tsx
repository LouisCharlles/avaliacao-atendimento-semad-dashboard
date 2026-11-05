import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import type { Usuario } from '../lib/tipos';
import logoColorido from '../assets/logos/semad-colorido-vertical-fundo-escuro.png';
import Rodape from '../components/Rodape';

export default function Login({ onEntrar }: { onEntrar: (u: Usuario) => void }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await api.login(usuario.trim(), senha);
      onEntrar(r.usuario);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha no login.');
      setSenha('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <main className="login__centro">
        <div className="login__cartao">
          <div className="login__topo">
            <img src={logoColorido} alt="Prefeitura de São Luís — SEMAD" />
          </div>
          <div className="login__faixa" />
          <form className="login__corpo" onSubmit={enviar} noValidate>
            <h1>Painel de Avaliação do Atendimento</h1>
            <p className="sub">Acesso restrito às equipes de Atendimento e Assessoria Técnica.</p>

            {erro && (
              <div className="erro" role="alert">
                <span aria-hidden>⚠️</span>
                <span>{erro}</span>
              </div>
            )}

            <div className="campo">
              <label htmlFor="usuario">Usuário</label>
              <input
                id="usuario"
                autoComplete="username"
                autoFocus
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="senha">Senha</label>
              <div className="senha">
                <input
                  id="senha"
                  type={mostrar ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setMostrar((m) => !m)} aria-pressed={mostrar}>
                  {mostrar ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            <button className="btn btn--primario btn--bloco" disabled={enviando || !usuario || !senha}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
            <p className="login__nota">Em caso de esquecimento da senha, procure a equipe de TI da SEMAD.</p>
          </form>
        </div>
      </main>
      <Rodape />
    </div>
  );
}
