// Notícias da rodada e relatório geral do Mercado de Ações.
import { rpc } from './db.js';
import { el, modal, real, icone } from './ui.js';
import { marca } from './logos.js';
import { miniGrafico, variacao, fmtPct } from './graficos.js';
import { botaoSobre } from './regras.js';
import { foto as fotoDe } from './fotos.js';

export const CATEGORIAS = {
  mundo: { nome: 'Mundo', icone: 'globo' },
  politica: { nome: 'Política Nacional', icone: 'governo' },
  obras: { nome: 'Obras e Serviços', icone: 'obra' },
  sorte: { nome: 'Sorte ou Revés', icone: 'sorte' },
};

const cache = new Map();
export async function obterRodada(salaId, rodada) {
  const chave = `${salaId}:${rodada}`;
  if (!cache.has(chave)) {
    cache.set(chave, rpc('rodada_info', { p_sala: salaId, p_rodada: rodada }).catch((e) => { cache.delete(chave); throw e; }));
  }
  return cache.get(chave);
}

function cartaNoticia(n) {
  const c = CATEGORIAS[n.categoria] || { nome: n.categoria, icone: 'globo' };
  return el('article', { class: `carta-noticia cat-${n.categoria}` },
    el('header', {}, icone(c.icone, 18), el('span', {}, c.nome)),
    el('p', {}, n.texto));
}

function indicador(rotulo, valor, anterior, casas = 1, inverso = false) {
  const v = Number(valor), a = anterior === null || anterior === undefined ? null : Number(anterior);
  const d = a === null ? 0 : v - a;
  const seta = a === null || Math.abs(d) < 0.005 ? '' : d > 0 ? '▲' : '▼';
  const ruim = inverso ? d < 0 : d > 0;
  return el('div', { class: 'indicador' },
    el('span', { class: 'indicador-rotulo' }, rotulo),
    el('strong', {}, fmtPct(v, casas)),
    seta ? el('span', { class: 'indicador-var ' + (ruim ? 'ruim' : 'bom') }, `${seta} ${fmtPct(Math.abs(d), casas)}`) : el('span', { class: 'indicador-var' }, 'estável'));
}

// Sequência: Notícias → Relatório geral. Chama aoFechar no fim.
export function mostrarNovidades(info, { aoFechar, inicio = 'noticias', euId = null, donos = {} } = {}) {
  let janela = null;
  const fechar = () => { janela?.fechar(); aoFechar?.(); };

  const paginaNoticias = () => {
    janela?.fechar();
    janela = modal({
      titulo: `Notícias da ${info.rodada}ª rodada`, classe: 'modal-noticias', fecharFora: false,
      conteudo: el('div', { class: 'cartas-noticias' }, info.noticias.map(cartaNoticia)),
      botoes: [{ texto: 'Próximo', classe: 'btn-ouro', acao: () => paginaRelatorio() }],
    });
  };

  const paginaRelatorio = () => {
    janela?.fechar();
    // dono atual de cada empresa (o mais recente que a tela tiver) e as minhas primeiro
    const comDono = info.empresas.map((e) => ({ ...e, ...(donos[e.id] || {}) }));
    const ordenadas = [...comDono.filter((e) => euId && e.dono_id === euId), ...comDono.filter((e) => !euId || e.dono_id !== euId)];
    janela = modal({
      titulo: 'Relatório geral do Mercado', classe: 'modal-relatorio', fecharFora: false,
      conteudo: el('div', {},
        el('div', { class: 'indicadores' },
          indicador('Inflação', info.inflacao, info.inflacao_ant, 2),
          indicador('Juros do banqueiro', info.juros, info.juros_ant, 2),
          indicador('Desemprego no país', info.desemprego_br, info.desemprego_br_ant),
          indicador('Desemprego em Neópolis', info.desemprego_local, info.desemprego_local_ant)),
        el('div', { class: 'relatorio-grade' }, ordenadas.map((e) => el('article', { class: 'relatorio-empresa' + (euId && e.dono_id === euId ? ' minha' : '') },
          el('div', { class: 'relatorio-topo' },
            el('img', { src: marca(e.id), alt: '' }),
            el('strong', {}, e.nome),
            botaoSobre(e),
            variacao(e.pct)),
          e.dono_id
            ? el('div', { class: 'relatorio-dono' }, el('img', { src: fotoDe(e.dono_id, e.dono_foto), alt: '' }),
              el('span', {}, euId && e.dono_id === euId ? 'Você' : e.dono_nome, el('small', {}, ` · ${e.acoes_dono} ${Number(e.acoes_dono) === 1 ? 'ação' : 'ações'}`)))
            : el('div', { class: 'relatorio-dono livre' }, el('span', {}, 'Disponível')),
          miniGrafico((e.serie || []).map(Number), 132, 38),
          el('div', { class: 'relatorio-precos' },
            el('span', {}, el('small', {}, 'Anterior'), real(e.anterior)),
            el('span', {}, el('small', {}, 'Atual'), el('b', {}, real(e.preco)))))))),
      botoes: [
        { texto: 'Voltar', classe: 'btn-fantasma', acao: () => paginaNoticias() },
        { texto: 'Fechar', classe: 'btn-ouro', acao: () => fechar() },
      ],
    });
  };

  if (inicio === 'relatorio') paginaRelatorio(); else paginaNoticias();
}
