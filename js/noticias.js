// Notícias da rodada e relatório geral do Mercado de Ações.
import { rpc } from './db.js';
import { el, modal, real, realCompacto, icone } from './ui.js';
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

// Mensagens da rodada, em abas: Notícias (valem para a próxima rodada), Balanço geral,
// Ranking (jogadores e empresas) e, a cada 5 rodadas, Presente aos acionistas.
const ABAS = [
  { id: 'noticias', nome: 'Notícias', icone: 'jornal' },
  { id: 'balanco', nome: 'Balanço geral', icone: 'grafico' },
  { id: 'ranking', nome: 'Ranking', icone: 'coroa' },
  { id: 'presentes', nome: 'Presentes', icone: 'presente' },
];

function paginaNoticias(info) {
  return el('div', { class: 'pilha' },
    el('p', { class: 'aviso-caixa msg-aviso' }, icone('relogio', 16),
      el('span', {}, `Estas notícias mexem nos preços no começo da `, el('strong', {}, `${info.rodada + 1}ª rodada`),
        '. Use esta rodada para se preparar.')),
    el('div', { class: 'cartas-noticias' }, info.noticias.map(cartaNoticia)));
}

function paginaBalanco(info, euId, donos) {
  const comDono = info.empresas.map((e) => ({ ...e, ...(donos[e.id] || {}) }));
  const ordenadas = [...comDono.filter((e) => euId && e.dono_id === euId), ...comDono.filter((e) => !euId || e.dono_id !== euId)];
  return el('div', {},
    info.rodada === 1 ? el('p', { class: 'aviso-caixa msg-aviso' }, icone('info', 16),
      el('span', {}, 'Primeira rodada: os preços são os da tabela inicial. As notícias começam a valer na 2ª rodada.')) : null,
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
        el('span', {}, el('small', {}, 'Atual'), el('b', {}, real(e.preco))))))));
}

function paginaRanking(info, euId, ranking) {
  const pct = Object.fromEntries((info.empresas || []).map((e) => [e.id, Number(e.pct)]));
  const jogadores = ranking?.ricos || [], empresas = ranking?.empresas || [];
  return el('div', { class: 'msg-ranking' },
    el('section', {},
      el('h3', { class: 'rotulo-pequeno' }, 'Jogadores'),
      el('ol', { class: 'msg-lista' }, jogadores.map((r) => el('li', { class: r.id === euId ? 'sou-eu' : '' },
        el('span', { class: 'msg-pos' }, `${r.posicao}º`),
        el('img', { class: 'msg-foto', src: fotoDe(r.id, r.foto), alt: '' }),
        el('span', { class: 'msg-nome' }, el('strong', {}, r.id === euId ? `${r.nome} (você)` : r.nome),
          el('small', {}, r.eliminado ? 'Faliu' : r.oculto ? 'Valores ocultos' : `Carteira ${realCompacto(r.carteira)} · Patrimônio ${realCompacto(r.patrimonio)}`)),
        el('b', { class: 'msg-valor' }, r.oculto ? '••••' : 'R$ ' + realCompacto(r.total)))))),
    el('section', {},
      el('h3', { class: 'rotulo-pequeno' }, 'Empresas (preço por ação)'),
      el('ol', { class: 'msg-lista' }, empresas.map((e) => el('li', { class: e.dono_id && e.dono_id === euId ? 'sou-eu' : '' },
        el('span', { class: 'msg-pos' }, `${e.posicao}º`),
        el('img', { class: 'msg-selo', src: marca(e.id), alt: '' }),
        el('span', { class: 'msg-nome' }, el('strong', {}, e.nome),
          el('small', {}, e.dono_nome ? `Dono: ${e.dono_id === euId ? 'você' : e.dono_nome} · ${e.acoes_dono} ações` : 'Disponível')),
        el('span', { class: 'msg-valor' }, el('b', {}, real(e.preco)), variacao(pct[e.id] ?? 0)))))));
}

function paginaPresentes(info, euId) {
  const lista = info.presentes || [];
  const meu = lista.filter((p) => p.jogador_id === euId).reduce((t, p) => t + Number(p.valor), 0);
  const total = lista.reduce((t, p) => t + Number(p.valor), 0);
  return el('div', { class: 'pilha' },
    el('div', { class: 'presente-topo' },
      el('span', { class: 'presente-caixa' }, icone('presente', 34)),
      el('div', {},
        el('h3', {}, 'Presente aos acionistas'),
        el('p', { class: 'texto-suave' }, 'A cada 5 rodadas, cada empresa com dono presenteia o dono com 20% do valor das ações dele. O dinheiro já está na carteira.'))),
    lista.length && euId ? el('p', { class: 'presente-meu' + (meu > 0 ? '' : ' nada') },
      meu > 0 ? ['Você recebeu ', el('strong', {}, real(meu)), ' de presente nesta rodada.'] : 'Você não tinha empresas nesta rodada, então não recebeu presente.') : null,
    lista.length
      ? el('ol', { class: 'msg-lista presentes-lista' }, lista.map((p, i) => el('li', { class: p.jogador_id === euId ? 'sou-eu' : '' },
        el('span', { class: 'msg-pos' }, `${i + 1}º`),
        el('img', { class: 'msg-selo', src: marca(p.empresa_id), alt: '' }),
        el('span', { class: 'msg-nome' }, el('strong', {}, p.empresa),
          el('small', {}, `${p.acoes} ${Number(p.acoes) === 1 ? 'ação' : 'ações'} × ${real(p.preco)}`)),
        el('span', { class: 'presente-para' }, el('img', { src: fotoDe(p.jogador_id, p.foto), alt: '' }), p.jogador_id === euId ? 'Você' : p.jogador),
        el('b', { class: 'msg-valor presente-valor' }, '+ ' + real(p.valor)))))
      : el('p', { class: 'texto-suave' }, 'Nenhuma empresa tinha dono nesta rodada.'),
    lista.length ? el('p', { class: 'texto-mini' }, `Total presenteado: ${real(total)}`) : null);
}

// aba: 'noticias' | 'balanco' | 'ranking' | 'presentes'. Chama aoFechar no fim.
export function mostrarNovidades(info, { aba = 'noticias', aoFechar, euId = null, donos = {}, ranking = null } = {}) {
  if (aba === 'relatorio') aba = 'balanco';
  const abas = ABAS.filter((a) => a.id !== 'presentes' || info.presente);
  let atual = Math.max(0, abas.findIndex((a) => a.id === aba));
  const barra = el('div', { class: 'msg-abas', role: 'tablist' });
  const corpo = el('div', { class: 'msg-corpo', role: 'tabpanel' });
  const conteudo = el('div', { class: 'msg' }, barra, corpo);
  const janela = modal({
    titulo: `Mensagens da ${info.rodada}ª rodada`, classe: 'modal-mensagens' + (info.presente ? ' com-presente' : ''), fecharFora: false,
    conteudo,
    botoes: [
      { texto: 'Anterior', classe: 'btn-fantasma msg-anterior', acao: () => ir(atual - 1) },
      { texto: 'Próxima', classe: 'btn-ouro msg-proxima', acao: (fechar) => { if (atual < abas.length - 1) ir(atual + 1); else { fechar(); aoFechar?.(); } } },
    ],
  });
  const caixa = corpo.closest('.modal');
  caixa.dataset.rodada = String(info.rodada);
  const btnAnt = caixa.querySelector('.msg-anterior'), btnProx = caixa.querySelector('.msg-proxima');
  const fecharX = el('button', { class: 'btn-icone msg-fechar', 'aria-label': 'Fechar mensagens', onclick: () => { janela.fechar(); aoFechar?.(); } }, icone('fechar'));
  caixa.prepend(fecharX);

  function ir(i) {
    atual = Math.max(0, Math.min(abas.length - 1, i));
    const a = abas[atual];
    barra.replaceChildren(...abas.map((x, k) => el('button', {
      class: 'msg-aba' + (k === atual ? ' ativa' : '') + (x.id === 'presentes' ? ' aba-presente' : ''), role: 'tab',
      'aria-selected': String(k === atual), 'data-aba': x.id, onclick: () => ir(k),
    }, icone(x.icone, 16), el('span', {}, x.nome))));
    corpo.replaceChildren(a.id === 'noticias' ? paginaNoticias(info)
      : a.id === 'balanco' ? paginaBalanco(info, euId, donos)
        : a.id === 'ranking' ? paginaRanking(info, euId, ranking)
          : paginaPresentes(info, euId));
    corpo.scrollTop = 0; janela.corpo.scrollTop = 0;
    btnAnt.style.visibility = atual === 0 ? 'hidden' : 'visible';
    btnProx.textContent = atual < abas.length - 1 ? `Próxima: ${abas[atual + 1].nome}` : 'Fechar';
    barra.querySelector('.ativa')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  ir(atual);
}
