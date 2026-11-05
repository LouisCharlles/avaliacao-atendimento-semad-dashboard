import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SetorResumo } from '../lib/tipos';
import { decimal1, nota, numero, pct } from '../lib/formato';
import { AZUL_SERIE, Dica, EIXO, GRADE, LinhaDica, Vazio } from './comum';

/** Abaixo disso o percentual oscila muito: a barra fica em tom claro. */
export const AMOSTRA_MINIMA = 10;
const AZUL_POUCAS = '#9ec5f4';

/** Ranking de satisfação por setor responsável (perguntas 2 a 4). */
export default function GraficoSetores({ setores }: { setores: SetorResumo[] }) {
  const dados = setores
    .filter((s) => s.total > 0)
    .sort((a, b) => (b.satisfacao ?? 0) - (a.satisfacao ?? 0));
  if (!dados.length) return <Vazio altura={260} />;

  const poucas = dados.some((s) => s.total < AMOSTRA_MINIMA);

  return (
    <div>
    {poucas && (
      <div className="legenda">
        <span className="legenda__item"><span className="legenda__amostra" style={{ background: AZUL_SERIE }} />{AMOSTRA_MINIMA} ou mais avaliações</span>
        <span className="legenda__item"><span className="legenda__amostra" style={{ background: AZUL_POUCAS }} />Menos de {AMOSTRA_MINIMA} avaliações (resultado pouco representativo)</span>
      </div>
    )}
    <ResponsiveContainer width="100%" height={dados.length * 34 + 28}>
      <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 92, bottom: 0, left: 0 }} barSize={18}>
        <CartesianGrid horizontal={false} stroke={GRADE} />
        <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={EIXO} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="sigla" width={64} tick={{ ...EIXO, fill: '#0f1b2a', fontWeight: 700 }} tickLine={false} axisLine={{ stroke: '#cdd4de' }} />
        <Tooltip
          cursor={{ fill: 'rgba(16,72,115,0.05)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const s = payload[0].payload as SetorResumo;
            return (
              <Dica titulo={`${s.sigla} · ${s.nome}`} sub={`${numero(s.total)} avaliações`}>
                <LinhaDica cor={AZUL_SERIE} rotulo="Satisfação" valor={pct(s.satisfacao)} />
                <LinhaDica rotulo="Cordialidade (média)" valor={nota(s.mediaCordialidade)} />
                <LinhaDica rotulo="Clareza (média)" valor={nota(s.mediaClareza)} />
                <LinhaDica rotulo="Tempo de resposta (média)" valor={nota(s.mediaTempo)} />
                <LinhaDica rotulo="Resolvidas totalmente" valor={pct(s.resolvidasTotal)} />
              </Dica>
            );
          }}
        />
        <Bar dataKey="satisfacao" fill={AZUL_SERIE} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {dados.map((s) => (
            <Cell key={s.sigla} fill={s.total < AMOSTRA_MINIMA ? AZUL_POUCAS : AZUL_SERIE} />
          ))}
          <LabelList
            dataKey="satisfacao"
            content={(p) => {
              const i = Number(p.index ?? 0);
              const item = dados[i];
              if (!item) return null;
              const y = Number(p.y ?? 0);
              const h = Number(p.height ?? 0);
              return (
                <text x={Number(p.x ?? 0) + Number(p.width ?? 0) + 8} y={y + h / 2} dy="0.35em" fontSize={12}>
                  <tspan fontWeight={700} fill="#0f1b2a">{decimal1(Number(p.value ?? 0))}%</tspan>
                  <tspan fill="#7a8494"> · n={numero(item.total)}</tspan>
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
