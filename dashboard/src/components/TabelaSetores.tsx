import { useMemo, useState } from 'react';
import type { SetorResumo } from '../lib/tipos';
import { nota, numero, pct } from '../lib/formato';

type Chave = keyof Pick<SetorResumo, 'sigla' | 'total' | 'mediaCordialidade' | 'mediaClareza' | 'mediaTempo' | 'satisfacao' | 'resolvidasTotal'>;

const COLUNAS: { chave: Chave; rotulo: string; num?: boolean }[] = [
  { chave: 'sigla', rotulo: 'Setor' },
  { chave: 'total', rotulo: 'Avaliações', num: true },
  { chave: 'mediaCordialidade', rotulo: 'Cordialidade', num: true },
  { chave: 'mediaClareza', rotulo: 'Clareza', num: true },
  { chave: 'mediaTempo', rotulo: 'Tempo de resposta', num: true },
  { chave: 'satisfacao', rotulo: 'Satisfação', num: true },
  { chave: 'resolvidasTotal', rotulo: 'Resolvidas', num: true },
];

export default function TabelaSetores({ setores }: { setores: SetorResumo[] }) {
  const [ordem, setOrdem] = useState<{ chave: Chave; desc: boolean }>({ chave: 'total', desc: true });

  const linhas = useMemo(() => {
    const l = [...setores];
    l.sort((a, b) => {
      const va = a[ordem.chave];
      const vb = b[ordem.chave];
      const r = typeof va === 'string' ? String(va).localeCompare(String(vb)) : (Number(va ?? -1) - Number(vb ?? -1));
      return ordem.desc ? -r : r;
    });
    return l;
  }, [setores, ordem]);

  return (
    <div className="tabela-wrap">
      <table className="tabela">
        <thead>
          <tr>
            {COLUNAS.map((c) => (
              <th key={c.chave} className={c.num ? 'num' : ''} aria-sort={ordem.chave === c.chave ? (ordem.desc ? 'descending' : 'ascending') : 'none'}>
                <button onClick={() => setOrdem((o) => ({ chave: c.chave, desc: o.chave === c.chave ? !o.desc : c.num ?? false }))}>
                  {c.rotulo}
                  <span aria-hidden style={{ opacity: ordem.chave === c.chave ? 1 : 0.25 }}>{ordem.chave === c.chave && !ordem.desc ? '↑' : '↓'}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((s) => (
            <tr key={s.sigla} style={s.total ? undefined : { color: '#9aa3b0' }}>
              <td>
                <span className="sigla">{s.sigla}</span>
                <div style={{ fontSize: 12, color: '#7a8494', whiteSpace: 'normal', maxWidth: 320 }}>{s.nome}</div>
              </td>
              <td className="num">{numero(s.total)}</td>
              <td className="num">{nota(s.mediaCordialidade)}</td>
              <td className="num">{nota(s.mediaClareza)}</td>
              <td className="num">{nota(s.mediaTempo)}</td>
              <td className="num">
                {s.satisfacao !== null && (
                  <span className="barrinha" aria-hidden>
                    <i style={{ width: `${s.satisfacao}%` }} />
                  </span>
                )}
                {pct(s.satisfacao)}
              </td>
              <td className="num">{pct(s.resolvidasTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 12, color: '#7a8494', margin: '8px 0 0' }}>
        Médias de 1 (Péssimo) a 5 (Excelente). Satisfação = % de respostas positivas nas perguntas 2 a 4.
      </p>
    </div>
  );
}
