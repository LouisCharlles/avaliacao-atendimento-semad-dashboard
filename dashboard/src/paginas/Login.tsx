import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import type { Usuario } from '../lib/tipos';
import logoColorido from '../assets/logos/semad-colorido-vertical-fundo-escuro.png';
import Rodape from '../components/Rodape';
import CampoSenha from '../components/CampoSenha';

const SENHA_MINIMA = 10;

type Modo = 'entrar' | 'trocar';

export default function Login({ onEntrar }: { onEntrar: (u: Usuario) => void }) {
  const [modo, setModo] = useState<Modo>('entrar');
  const [usuario, setUsuario] = useState('');
  const [sucesso, setSucesso] = useState<string | null>(null);

  return (
    <div className="login">
      <main className="login__centro">
        <div className="login__cartao">
          <div className="login__topo">
            <img src={logoColorido} alt="Prefeitura de São Luís — SEMAD" />
          </div>
          <div className="login__faixa" />
          {modo === 'entrar' ? (
            <FormEntrar
              usuario={usuario}
              setUsuario={setUsuario}
              sucesso={sucesso}
              onEntrar={onEntrar}
              onTrocarSenha={() => {
                setSucesso(null);
                setModo('trocar');
              }}
            />
          ) : (
            <FormTrocarSenha
              usuarioInicial={usuario}
              onConcluir={(u) => {
                setUsuario(u);
                setSucesso('Senha alterada com sucesso. Entre com a nova senha.');
                setModo('entrar');
              }}
              onVoltar={() => setModo('entrar')}
            />
          )}
        </div>
      </main>
      <Rodape />
    </div>
  );
}

function Mensagens({ erro, sucesso }: { erro: string | null; sucesso?: string | null }) {
  return (
    <>
      {sucesso && !erro && (
        <div className="sucesso" role="status">
          <span aria-hidden>✅</span>
          <span>{sucesso}</span>
        </div>
      )}
      {erro && (
        <div className="erro" role="alert">
          <span aria-hidden>⚠️</span>
          <span>{erro}</span>
        </div>
      )}
    </>
  );
}

function FormEntrar({
  usuario,
  setUsuario,
  sucesso,
  onEntrar,
  onTrocarSenha,
}: {
  usuario: string;
  setUsuario: (v: string) => void;
  sucesso: string | null;
  onEntrar: (u: Usuario) => void;
  onTrocarSenha: () => void;
}) {
  const [senha, setSenha] = useState('');
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
    <form className="login__corpo" onSubmit={enviar} noValidate>
      <h1>Painel de Avaliação do Atendimento</h1>
      <p className="sub">Acesso restrito às equipes de Atendimento e Assessoria Técnica.</p>

      <Mensagens erro={erro} sucesso={sucesso} />

      <div className="campo">
        <label htmlFor="usuario">Usuário</label>
        <input
          id="usuario"
          autoComplete="username"
          autoFocus={!usuario}
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          required
        />
      </div>
      <CampoSenha
        id="senha"
        rotulo="Senha"
        valor={senha}
        onChange={setSenha}
        autoComplete="current-password"
        autoFocus={Boolean(usuario)}
      />
      <button className="btn btn--primario btn--bloco" disabled={enviando || !usuario || !senha}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
      <button type="button" className="login__link" onClick={onTrocarSenha}>
        Trocar senha
      </button>
      <p className="login__nota">Em caso de esquecimento da senha, procure a equipe de TI da SEMAD.</p>
    </form>
  );
}

function FormTrocarSenha({
  usuarioInicial,
  onConcluir,
  onVoltar,
}: {
  usuarioInicial: string;
  onConcluir: (usuario: string) => void;
  onVoltar: () => void;
}) {
  const [usuario, setUsuario] = useState(usuarioInicial);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const preenchido = usuario.trim() && senhaAtual && novaSenha && confirmacao;

  function validar(): string | null {
    if (novaSenha.length < SENHA_MINIMA) return `A nova senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`;
    if (novaSenha !== confirmacao) return 'A confirmação não confere com a nova senha.';
    if (novaSenha === senhaAtual) return 'A nova senha deve ser diferente da senha atual.';
    return null;
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await api.trocarSenha(usuario.trim(), senhaAtual, novaSenha);
      onConcluir(usuario.trim());
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível trocar a senha.');
      setSenhaAtual('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="login__corpo" onSubmit={enviar} noValidate>
      <h1>Trocar senha</h1>
      <p className="sub">Informe a senha atual e escolha uma nova senha.</p>

      <Mensagens erro={erro} />

      <div className="campo">
        <label htmlFor="tro-usuario">Usuário</label>
        <input
          id="tro-usuario"
          autoComplete="username"
          autoFocus={!usuarioInicial}
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          required
        />
      </div>
      <CampoSenha
        id="tro-atual"
        rotulo="Senha atual"
        valor={senhaAtual}
        onChange={setSenhaAtual}
        autoComplete="current-password"
        autoFocus={Boolean(usuarioInicial)}
      />
      <CampoSenha
        id="tro-nova"
        rotulo="Nova senha"
        valor={novaSenha}
        onChange={setNovaSenha}
        autoComplete="new-password"
        ajuda={`Mínimo de ${SENHA_MINIMA} caracteres.`}
      />
      <CampoSenha
        id="tro-confirmacao"
        rotulo="Confirmar nova senha"
        valor={confirmacao}
        onChange={setConfirmacao}
        autoComplete="new-password"
      />
      <button className="btn btn--primario btn--bloco" disabled={enviando || !preenchido}>
        {enviando ? 'Salvando…' : 'Salvar nova senha'}
      </button>
      <button type="button" className="login__link" onClick={onVoltar} disabled={enviando}>
        ← Voltar para o login
      </button>
    </form>
  );
}
