import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PerguntaResumo } from '../lib/tipos';
import { COR_ESCALA, ROTULO_QUALIDADE, ROTULO_SATISFACAO, TINTA_ESCALA, EMOJI_NOTA } from '../lib/dominio';
import { decimal1, numero, pct } from '../lib/formato';
import { Dica, LinhaDica, Vazio, EIXO } from './comum';

const VALORES = [5, 4, 3, 2, 1] as const;

interface Linha {
  id: string;
  rotulo: string;
  texto: string;
  total: number;
  media: number | null;
  satisfacao: number | null;
  [k: string]: string | number | null;
}

/** Rótulo dentro do segmento: só aparece quando cabe (≥ 7% da largura). */
function rotuloSegmento(valor: number) {
  return function Conteudo(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown }) {
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const w = Number(props.width ?? 0);
    const h = Number(props.height ?? 0);
    const v = Number(props.value ?? 0);
    if (!v || w < 38) return null;
    return (
      <text x={x + 8} y={y + h / 2} dy="0.35em" fontSize={12} fontWeight={600} fill={TINTA_ESCALA[valor]}>
        {decimal1(v)}%
      </text>
    );
  };
}

/** Barras 100% empilhadas (escala Likert divergente) para as perguntas 1 a 4. */
export default function GraficoLikert({ perguntas, total }: { perguntas: PerguntaResumo[]; total: number }) {
  if (!total) return <Vazio altura={260} />;

  const dados: Linha[] = perguntas.map((p) => {
    const linha: Linha = {
      id: p.id,
      rotulo: `${p.id.toUpperCase()} · ${p.curto}`,
      texto: p.texto,
      total,
      media: p.media,
      satisfacao: p.satisfacao,
    };
    for (const o of p.distribuicao) {
      linha[`v${o.valor}`] = o.percentual ?? 0;
      linha[`n${o.valor}`] = o.quantidade;
    }
    return linha;
  });

  return (
    <div>
      <div className="legenda" role="list" aria-label="Legenda">
        {VALORES.map((v) => (
          <span className="legenda__item" role="listitem" key={v}>
            <span className="legenda__amostra" style={{ background: COR_ESCALA[v] }} />
            <span aria-hidden>{EMOJI_NOTA[v]}</span>
            {ROTULO_QUALIDADE[v]}
            {v !== 3 && <span style={{ color: '#9aa3b0' }}>/ {ROTULO_SATISFACAO[v]}</span>}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={dados.length * 58 + 24}>
        <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barSize={28}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="rotulo"
            width={200}
            tick={{ ...EIXO, fill: '#4a5566', fontSize: 12.5 }}
            tickLine={false}
            axisLine={false}
          />
          {/* Índice de satisfação (Excelente + Bom) à direita de cada barra */}
          <YAxis
            yAxisId="satisfacao"
            orientation="right"
            type="category"
            dataKey="rotulo"
            width={64}
            tickLine={false}
            axisLine={false}
            tick={(props: { x?: number | string; y?: number | string; index?: number }) => {
              const l = dados[Number(props.index ?? 0)];
              return (
                <text x={Number(props.x ?? 0) + 6} y={Number(props.y ?? 0)} dy="0.35em" fontSize={13} fontWeight={700} fill="#0f1b2a">
                  {l?.satisfacao === null || l?.satisfacao === undefined ? '—' : `${decimal1(l.satisfacao)}%`}
                </text>
              );
            }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(16,72,115,0.05)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const l = payload[0].payload as Linha;
              const escala = l.id === 'q4' ? ROTULO_SATISFACAO : ROTULO_QUALIDADE;
              return (
                <Dica titulo={l.rotulo} sub={`Média ${l.media?.toFixed(2).replace('.', ',') ?? '—'} de 5 · ${numero(l.total)} respostas`}>
                  {VALORES.map((v) => (
                    <LinhaDica
                      key={v}
                      cor={COR_ESCALA[v]}
                      rotulo={`${EMOJI_NOTA[v]} ${escala[v]}`}
                      valor={`${pct(l[`v${v}`] as number)} (${numero(l[`n${v}`] as number)})`}
                    />
                  ))}
                </Dica>
              );
            }}
          />
          {VALORES.map((v) => (
            <Bar
              key={v}
              dataKey={`v${v}`}
              stackId="likert"
              fill={COR_ESCALA[v]}
              stroke="#ffffff"
              strokeWidth={2}
              radius={4}
              isAnimationActive={false}
            >
              <LabelList dataKey={`v${v}`} content={rotuloSegmento(v)} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7a8494' }}>
        O número à direita é o índice de satisfação da pergunta (Excelente + Bom, ou Muito satisfatório + Satisfatório).
      </p>
    </div>
  );
}
