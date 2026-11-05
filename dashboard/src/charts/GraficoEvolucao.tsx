import { useState } from 'react';
import { type TooltipContentProps, Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import type { Painel } from '../lib/tipos';
import { dataBr, diaCurto, numero, pct } from '../lib/formato';
import { AZUL_SERIE, BASE, Dica, EIXO, GRADE, LinhaDica } from './comum';

type Modo = 'volume' | 'satisfacao';

export default function GraficoEvolucao({ serie, modoInicial = 'volume' }: { serie: Painel['serieDiaria']; modoInicial?: Modo }) {
  const [modo, setModo] = useState<Modo>(modoInicial);
  const intervalo = serie.length > 45 ? Math.ceil(serie.length / 12) - 1 : serie.length > 20 ? 2 : 0;

  const dica = ({ active, payload }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as Painel['serieDiaria'][number];
    return (
      <Dica titulo={dataBr(d.dia)}>
        <LinhaDica cor={modo === 'volume' ? AZUL_SERIE : undefined} rotulo="Avaliações" valor={numero(d.total)} />
        <LinhaDica cor={modo === 'satisfacao' ? AZUL_SERIE : undefined} rotulo="Satisfação" valor={pct(d.satisfacao)} />
      </Dica>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -46, marginBottom: 14 }} data-export-ignorar>
        <div className="alternar" role="group" aria-label="Métrica">
          <button aria-pressed={modo === 'volume'} onClick={() => setModo('volume')}>Avaliações</button>
          <button aria-pressed={modo === 'satisfacao'} onClick={() => setModo('satisfacao')}>Satisfação (%)</button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        {modo === 'volume' ? (
          <BarChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke={GRADE} />
            <XAxis dataKey="dia" tickFormatter={diaCurto} tick={EIXO} tickLine={false} axisLine={{ stroke: BASE }} interval={intervalo} />
            <YAxis allowDecimals={false} tick={EIXO} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'rgba(16,72,115,0.06)' }} content={dica} />
            <Bar dataKey="total" fill={AZUL_SERIE} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        ) : (
          <AreaChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={GRADE} />
            <XAxis dataKey="dia" tickFormatter={diaCurto} tick={EIXO} tickLine={false} axisLine={{ stroke: BASE }} interval={intervalo} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={EIXO} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ stroke: '#9aa3b0', strokeWidth: 1 }} content={dica} />
            <Area
              type="monotone"
              dataKey="satisfacao"
              stroke={AZUL_SERIE}
              strokeWidth={2}
              fill={AZUL_SERIE}
              fillOpacity={0.1}
              connectNulls
              dot={false}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
