import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ErroApi } from '../lib/api';
import type { Filtros, Painel, Usuario } from '../lib/tipos';
import { NOME_SETOR } from '../lib/dominio';
import { dataBr, horaBr, numero } from '../lib/formato';
import logoBranco from '../assets/logos/semad-branco-horizontal.png';
import BarraFiltros, { intervaloDoPreset, MenuExportar, type Preset } from '../components/BarraFiltros';
import Indicadores from '../components/Indicadores';
import Cartao from '../components/Cartao';
import TabelaSetores from '../components/TabelaSetores';
import ListaComentarios from '../components/ListaComentarios';
import Rodape from '../components/Rodape';
import GraficoLikert from '../charts/GraficoLikert';
import GraficoResolucao from '../charts/GraficoResolucao';
import GraficoEvolucao from '../charts/GraficoEvolucao';
import GraficoHorario from '../charts/GraficoHorario';
import GraficoSetores from '../charts/GraficoSetores';

const ATUALIZAR_A_CADA_MS = 2 * 60 * 1000;

interface Props {
  usuario: Usuario;
  onSair: () => void;
  onSessaoExpirada: () => void;
}

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export default function PainelPagina({ usuario, onSair, onSessaoExpirada }: Props) {
  const [preset, setPreset] = useState<Preset>('30d');
  const [filtros, setFiltros] = useState<Filtros>({ ...intervaloDoPreset('30d')!, setor: null });
  const [painel, setPainel] = useState<Painel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);
  const raiz = useRef<HTMLDivElement>(null);

  const carregar = useCallback(
    async (f: Filtros) => {
      try {
        const p = await api.painel(f);
        setPainel(p);
        setErro(null);
        setAtualizadoEm(new Date());
      } catch (e) {
        if (e instanceof ErroApi && e.status === 401) return onSessaoExpirada();
        setErro(e instanceof Error ? e.message : 'Falha ao carregar os dados.');
      }
    },
    [onSessaoExpirada],
  );

  useEffect(() => {
    carregar(filtros);
    const t = setInterval(() => carregar(filtros), ATUALIZAR_A_CADA_MS);
    return () => clearInterval(t);
  }, [filtros, carregar]);

  async function exportar(tipo: 'pdf' | 'excel') {
    if (!painel || !raiz.current) return;
    setExportando(tipo === 'pdf' ? 'Gerando PDF…' : 'Gerando Excel…');
    try {
      if (tipo === 'excel') await api.baixarExcel(filtros);
      else {
        const { exportarPdf } = await import('../lib/exportarPdf');
        await exportarPdf(painel, usuario, raiz.current);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha na exportação.');
    } finally {
      setExportando(null);
    }
  }

  const total = painel?.indicadores.total ?? 0;
  const setorRotulo = filtros.setor ? `${filtros.setor} · ${NOME_SETOR[filtros.setor]}` : 'Todos os setores';

  return (
    <>
      <header className="cabecalho">
        <div className="cabecalho__in">
          <img className="cabecalho__logo" src={logoBranco} alt="Prefeitura de São Luís — SEMAD" />
          <span className="cabecalho__sep" />
          <div className="cabecalho__titulo">
            Painel de Avaliação do Atendimento
            <small>Central de Atendimento ao Servidor · CEAT</small>
          </div>
          <div className="cabecalho__espaco" />
          <div className="usuario">
            <div className="usuario__avatar" aria-hidden>{iniciais(usuario.nome) || 'U'}</div>
            <div className="usuario__txt">
              <div className="usuario__nome">{usuario.nome}</div>
              <div className="usuario__perfil">Perfil: {usuario.perfilRotulo}</div>
            </div>
            <button className="btn btn--fantasma" onClick={onSair}>Sair</button>
          </div>
        </div>
        <div className="cabecalho__faixa" />
      </header>

      <main className="conteudo" ref={raiz}>
        <div className="titulo-pagina">
          <div>
            <h1>Avaliação do atendimento</h1>
            <p>
              {dataBr(filtros.inicio)} a {dataBr(filtros.fim)} · {setorRotulo}
              {painel && ` · ${numero(total)} avaliações`}
            </p>
          </div>
          {atualizadoEm && (
            <span className="atualizado">
              <span className="ponto" aria-hidden /> Atualizado às {horaBr(atualizadoEm)} · atualiza a cada 2 min
            </span>
          )}
        </div>

        <BarraFiltros
          filtros={filtros}
          preset={preset}
          onChange={(f, p) => {
            setFiltros(f);
            setPreset(p);
          }}
          exportar={<MenuExportar onExcel={() => exportar('excel')} onPdf={() => exportar('pdf')} ocupado={exportando} />}
        />

        {erro && <div className="aviso" role="alert">{erro}</div>}

        {!painel ? (
          <div className="carregando">
            <div className="spinner" aria-hidden />
            <span>Carregando indicadores…</span>
          </div>
        ) : (
          <>
            <Indicadores ind={painel.indicadores} />

            <div className="grade">
              <Cartao
                className="c12"
                exportId="likert"
                titulo="Como os servidores avaliaram o atendimento"
                subtitulo="Distribuição das respostas das perguntas 1 a 4, da melhor (azul) à pior (vermelho)"
              >
                <GraficoLikert perguntas={painel.perguntas} total={total} />
              </Cartao>

              <Cartao
                className="c5"
                exportId="resolucao"
                titulo="A demanda foi solucionada?"
                subtitulo="Pergunta 5 · solução ou encaminhamento pelo setor responsável"
              >
                <GraficoResolucao opcoes={painel.resolucao.opcoes} total={total} />
              </Cartao>

              <Cartao className="c7" exportId="evolucao" titulo="Evolução diária" subtitulo="Volume de avaliações e índice de satisfação por dia">
                <GraficoEvolucao serie={painel.serieDiaria} />
              </Cartao>

              <Cartao
                className="c7"
                exportId="setores"
                titulo="Satisfação por setor responsável"
                subtitulo="Respostas positivas nas perguntas 2 a 4 · ordenado da maior para a menor"
              >
                <GraficoSetores setores={painel.porSetor} />
              </Cartao>

              <Cartao className="c5" exportId="horario" titulo="Horários de maior procura" subtitulo="Avaliações registradas por hora do dia">
                <GraficoHorario porHora={painel.porHora} />
              </Cartao>

              <Cartao className="c12" titulo="Indicadores por setor" subtitulo="Clique no nome da coluna para ordenar">
                <TabelaSetores setores={painel.porSetor} />
              </Cartao>

              <Cartao className="c12" titulo="O que os servidores disseram" subtitulo="Comentários opcionais deixados no totem">
                <ListaComentarios comentarios={painel.comentarios} />
              </Cartao>
            </div>
          </>
        )}
      </main>
      <Rodape />
    </>
  );
}
