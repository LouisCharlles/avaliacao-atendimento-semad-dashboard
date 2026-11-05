import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OpcaoResolucao } from '../lib/tipos';
import { COR_RESOLUCAO } from '../lib/dominio';
import { decimal1, numero, pct } from '../lib/formato';
import { Dica, LinhaDica, Vazio, EIXO } from './comum';

/** Pergunta 5: barras horizontais com valor na ponta. */
export default function GraficoResolucao({ opcoes, total }: { opcoes: OpcaoResolucao[]; total: number }) {
  if (!total) return <Vazio altura={220} />;
  const dados = opcoes.map((o) => ({ ...o, nome: `${o.emoji}  ${o.rotulo}`, pctv: o.percentual ?? 0 }));
  const maximo = Math.max(...dados.map((d) => d.pctv), 1);

  return (
    <ResponsiveContainer width="100%" height={dados.length * 52 + 16}>
      <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 96, bottom: 4, left: 0 }} barSize={24}>
        <XAxis type="number" domain={[0, maximo * 1.05]} hide />
        <YAxis
          type="category"
          dataKey="nome"
          width={200}
          tick={{ ...EIXO, fill: '#4a5566', fontSize: 13 }}
          tickLine={false}
          axisLine={{ stroke: '#cdd4de' }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(16,72,115,0.05)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as (typeof dados)[number];
            return (
              <Dica titulo={d.rotulo}>
                <LinhaDica cor={COR_RESOLUCAO[d.valor]} rotulo="Respostas" valor={numero(d.quantidade)} />
                <LinhaDica rotulo="% do total" valor={pct(d.percentual)} />
              </Dica>
            );
          }}
        />
        <Bar dataKey="pctv" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {dados.map((d) => (
            <Cell key={d.valor} fill={COR_RESOLUCAO[d.valor]} />
          ))}
          <LabelList
            dataKey="pctv"
            content={(p) => {
              const i = Number(p.index ?? 0);
              const y = Number(p.y ?? 0);
              const h = Number(p.height ?? 0);
              return (
                <text x={Number(p.x ?? 0) + Number(p.width ?? 0) + 8} y={y + h / 2} dy="0.35em" fontSize={12.5}>
                  <tspan fontWeight={700} fill="#0f1b2a">{decimal1(Number(p.value ?? 0))}%</tspan>
                  <tspan fill="#7a8494"> ({numero(dados[i].quantidade)})</tspan>
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
