import { useMemo, useState } from 'react';
import type { Comentario } from '../lib/tipos';
import { EMOJI_NOTA, EMOJI_RESOLUCAO, NOME_SETOR, ROTULO_RESOLUCAO } from '../lib/dominio';
import { dataHoraBr } from '../lib/formato';

type Tom = 'todos' | 'positivos' | 'negativos';

function mediaComentario(c: Comentario) {
  return (c.q1 + c.q2 + c.q3 + c.q4) / 4;
}

export default function ListaComentarios({ comentarios }: { comentarios: Comentario[] }) {
  const [busca, setBusca] = useState('');
  const [tom, setTom] = useState<Tom>('todos');

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return comentarios.filter((c) => {
      const m = mediaComentario(c);
      if (tom === 'positivos' && m < 4) return false;
      if (tom === 'negativos' && m >= 3) return false;
      return !termo || c.comentario.toLocaleLowerCase('pt-BR').includes(termo) || c.setor.toLowerCase().includes(termo);
    });
  }, [comentarios, busca, tom]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }} data-export-ignorar>
        <div className="alternar" role="group" aria-label="Filtrar por tom">
          {(['todos', 'positivos', 'negativos'] as Tom[]).map((t) => (
            <button key={t} aria-pressed={tom === t} onClick={() => setTom(t)}>
              {t === 'todos' ? 'Todos' : t === 'positivos' ? '😄 Positivos' : '🙁 Negativos'}
            </button>
          ))}
        </div>
        <input className="busca" type="search" placeholder="Buscar no texto ou setor…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar comentários" />
      </div>
      {filtrados.length === 0 ? (
        <div className="vazio">Nenhum comentário encontrado.</div>
      ) : (
        <div className="comentarios">
          {filtrados.map((c) => (
            <article className="comentario" key={c.id}>
              <div className="comentario__meta">
                <span className="chip chip--setor" title={NOME_SETOR[c.setor]}>{c.setor}</span>
                <span>{dataHoraBr(c.respondidoEm)}</span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
                  <span className="chip" title="CEAT">CEAT {EMOJI_NOTA[c.q1]}</span>
                  <span className="chip" title="Cordialidade">Cord. {EMOJI_NOTA[c.q2]}</span>
                  <span className="chip" title="Clareza">Clar. {EMOJI_NOTA[c.q3]}</span>
                  <span className="chip" title="Tempo de resposta">Tempo {EMOJI_NOTA[c.q4]}</span>
                  <span className="chip" title={ROTULO_RESOLUCAO[c.q5]}>{EMOJI_RESOLUCAO[c.q5]} {ROTULO_RESOLUCAO[c.q5]}</span>
                </span>
              </div>
              <p className="comentario__texto">“{c.comentario}”</p>
            </article>
          ))}
        </div>
      )}
      <p style={{ fontSize: 12, color: '#7a8494', margin: '10px 0 0' }}>
        Exibindo os {comentarios.length} comentários mais recentes do período. A lista completa está na exportação em Excel.
      </p>
    </div>
  );
}
