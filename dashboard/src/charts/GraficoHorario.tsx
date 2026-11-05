import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Painel } from '../lib/tipos';
import { numero } from '../lib/formato';
import { AZUL_SERIE, BASE, Dica, EIXO, GRADE, LinhaDica, Vazio } from './comum';

/** Avaliações por hora do dia (ajuda a dimensionar a equipe nos horários de pico). */
export default function GraficoHorario({ porHora }: { porHora: Painel['porHora'] }) {
  const comDados = porHora.filter((h) => h.total > 0);
  if (!comDados.length) return <Vazio altura={220} />;
  const min = Math.min(7, comDados[0].hora);
  const max = Math.max(18, comDados[comDados.length - 1].hora);
  const dados = porHora.filter((h) => h.hora >= min && h.hora <= max).map((h) => ({ ...h, rotulo: `${h.hora}h` }));
  const pico = dados.reduce((a, b) => (b.total > a.total ? b : a), dados[0]);

  return (
    <div>
      <p style={{ margin: '-6px 0 10px', fontSize: 12.5, color: '#4a5566' }}>
        Pico às <strong>{pico.hora}h</strong> com {numero(pico.total)} avaliações.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={dados} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={GRADE} />
          <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={{ stroke: BASE }} interval={0} />
          <YAxis allowDecimals={false} tick={EIXO} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(16,72,115,0.06)' }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <Dica titulo={`${payload[0].payload.hora}h às ${payload[0].payload.hora + 1}h`}>
                  <LinhaDica cor={AZUL_SERIE} rotulo="Avaliações" valor={numero(payload[0].payload.total)} />
                </Dica>
              ) : null
            }
          />
          <Bar dataKey="total" fill={AZUL_SERIE} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
