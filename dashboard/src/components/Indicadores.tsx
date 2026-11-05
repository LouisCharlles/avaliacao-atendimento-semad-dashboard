import type { Painel } from '../lib/tipos';
import { decimal1, nota, numero } from '../lib/formato';

type Direcao = 'maior-melhor' | 'neutro';

function Delta({ atual, anterior, unidade, direcao = 'maior-melhor' }: { atual: number | null; anterior: number | null; unidade: 'pp' | 'pts' | '%'; direcao?: Direcao }) {
  if (atual === null || anterior === null || anterior === undefined) {
    return <span className="delta">Sem dados no período anterior</span>;
  }
  let diff = atual - anterior;
  let texto: string;
  if (unidade === '%') {
    diff = anterior === 0 ? 0 : ((atual - anterior) / anterior) * 100;
    texto = `${decimal1(Math.abs(diff))}%`;
  } else if (unidade === 'pp') {
    texto = `${decimal1(Math.abs(diff))} p.p.`;
  } else {
    texto = Math.abs(diff).toFixed(2).replace('.', ',');
  }
  const igual = Math.abs(diff) < 0.05;
  const seta = igual ? '•' : diff > 0 ? '▲' : '▼';
  const classe = igual || direcao === 'neutro' ? '' : diff > 0 ? 'delta--bom' : 'delta--ruim';
  return (
    <span className={`delta ${classe}`}>
      <span aria-hidden>{seta}</span> {igual ? 'Estável' : texto} vs. período anterior
    </span>
  );
}

export default function Indicadores({ ind }: { ind: Painel['indicadores'] }) {
  return (
    <div className="indicadores">
      <div className="cartao indicador indicador--destaque" data-export-kpi>
        <span className="indicador__rotulo">Índice de satisfação geral</span>
        <span className="indicador__valor">
          {ind.satisfacaoGeral === null ? '—' : decimal1(ind.satisfacaoGeral)}
          <small style={{ color: 'rgba(255,255,255,.75)' }}>%</small>
        </span>
        <div className="medidor" aria-hidden>
          <div style={{ width: `${ind.satisfacaoGeral ?? 0}%` }} />
        </div>
        <Delta atual={ind.satisfacaoGeral} anterior={ind.satisfacaoGeralAnterior} unidade="pp" />
      </div>

      <div className="cartao indicador">
        <span className="indicador__rotulo">Avaliações recebidas</span>
        <span className="indicador__valor">{numero(ind.total)}</span>
        <Delta atual={ind.total} anterior={ind.totalAnterior || null} unidade="%" direcao="neutro" />
      </div>

      <div className="cartao indicador">
        <span className="indicador__rotulo">Nota média da CEAT</span>
        <span className="indicador__valor">
          {nota(ind.mediaCeat)}
          <small>/ 5</small>
        </span>
        <Delta atual={ind.mediaCeat} anterior={ind.mediaCeatAnterior} unidade="pts" />
      </div>

      <div className="cartao indicador">
        <span className="indicador__rotulo">Demandas resolvidas totalmente</span>
        <span className="indicador__valor">
          {ind.resolvidasTotal === null ? '—' : decimal1(ind.resolvidasTotal)}
          <small>%</small>
        </span>
        <Delta atual={ind.resolvidasTotal} anterior={ind.resolvidasTotalAnterior} unidade="pp" />
      </div>

      <div className="cartao indicador">
        <span className="indicador__rotulo">Comentários deixados</span>
        <span className="indicador__valor">{numero(ind.comentarios)}</span>
        <span className="delta">
          {ind.total ? `${decimal1((ind.comentarios / ind.total) * 100)}% das avaliações` : '—'}
        </span>
      </div>
    </div>
  );
}
