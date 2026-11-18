// Tela principal da partida: cidade de Neópolis ao fundo, cartão do jogador,
// inflação, faixa de notícias, linha das rodadas, ranking e ajuda.
// Notícias, Mercado de Ações e Banqueiro entram nas próximas etapas.
import { rpc } from './db.js';
import { el, real, realCompacto, toast, modal, icone } from './ui.js';
import { fotoSrc } from './avatares.js';
import { SETORES, textoAjuda } from './regras.js';
import { marca, logo } from './logos.js';
import { criarCidade } from './cidade.js';
import { garantirFotos, foto as fotoDe, todasFotos } from './fotos.js';
import { obterRodada, mostrarNovidades, CATEGORIAS } from './noticias.js';
import { graficoPreco, variacao, fmtPct } from './graficos.js';
import { criarMercado } from './mercado.js';
import { abrirBanqueiro } from './banqueiro.js';

let catalogo = null;
async function carregarCatalogo() {
  if (!catalogo) catalogo = rpc('catalogo_empresas').then((l) => Object.fromEntries(l.map((e) => [e.id, e]))).catch(() => { catalogo = null; return {}; });
  return catalogo;
}

export function criarPrincipal({ token, atualizarTudo }) {
  let est = null;
  let abaRanking = 'ricos';
  let ultimoRanking = 0, buscandoRanking = false, dadosRanking = null;

  // --- cartão do jogador ---
  const foto = el('img', { class: 'cartao-foto', alt: '' });
  const nome = el('strong', { class: 'cartao-nome' });
  const vCarteira = el('span', { class: 'valor', 'data-campo': 'carteira' });
  const vPatrimonio = el('span', { class: 'valor', 'data-campo': 'patrimonio' });
  const btnOlho = el('button', { class: 'btn-icone', 'aria-label': 'Ocultar meus valores no ranking', onclick: alternarOculto });
  const btnGrafico = el('button', { class: 'btn-icone', 'aria-label': 'Ver meu progresso até a meta', onclick: abrirProgresso }, icone('grafico'));
  const avisoOculto = el('span', { class: 'cartao-oculto' }, 'Oculto no ranking');
  const vDividas = el('span', { class: 'valor negativo' });
  const linhaDividas = el('div', { class: 'linha-valor', hidden: true }, el('span', {}, 'Dívidas'), vDividas);
  const avisoCarteira = el('p', { class: 'cartao-alerta', hidden: true });

  const cartao = el('section', { class: 'painel cartao-jogador' },
    foto,
    el('div', { class: 'cartao-dados' },
      el('div', { class: 'cartao-topo' }, nome, el('div', { class: 'cartao-botoes' }, btnOlho, btnGrafico)),
      el('div', { class: 'linha-valor' }, el('span', {}, 'Carteira'), vCarteira),
      el('div', { class: 'linha-valor' }, el('span', {}, 'Patrimônio'), vPatrimonio),
      linhaDividas,
      avisoOculto, avisoCarteira));

  const vInflacao = el('strong', { class: 'inflacao-valor' }, '—');
  const vInflacaoVar = el('span', { class: 'inflacao-var' });
  const vDesemprego = el('span', { class: 'texto-mini inflacao-desemprego' }, 'atualiza depois das notícias');
  const inflacao = el('button', {
    class: 'painel caixa-inflacao', 'aria-label': 'Ver o relatório geral do mercado',
    onclick: () => abrirNovidades('relatorio'),
  }, el('span', { class: 'rotulo-pequeno' }, 'Inflação'), vInflacao, vInflacaoVar, vDesemprego);

  // --- faixa de notícias e linha das rodadas ---
  const faixaTexto = el('div', { class: 'faixa-texto' });
  const faixa = el('button', { class: 'painel faixa-noticias', 'aria-label': 'Ver as notícias da rodada', onclick: () => abrirNovidades('noticias') },
    el('span', { class: 'faixa-etiqueta' }, 'NOTÍCIAS'),
    el('div', { class: 'faixa-janela' }, faixaTexto));
  const preencherFaixa = (txt) => {
    faixaTexto.replaceChildren(el('span', {}, txt), el('span', {}, txt));
    faixaTexto.style.animationDuration = `${Math.max(30, txt.length * 0.22)}s`;
  };
  preencherFaixa('Neópolis abre os negócios  ·  As notícias de cada rodada passam por esta faixa  ·  ');
  let info = null, rodadaInfo = null, leiloesAbertos = null;
  const linhaRodadas = el('ol', { class: 'linha-rodadas', 'aria-label': 'Rodadas' });
  const topo = el('div', { class: 'topo' }, faixa, linhaRodadas);

  // --- direita: banqueiro + ranking ---
  const btnBanqueiro = el('button', {
    class: 'btn-redondo btn-banqueiro', 'aria-label': 'Banqueiro',
    onclick: () => abrirBanqueiro({ token, aoMudar: () => { atualizarTudo?.(); ultimoRanking = 0; carregarRanking(); } }),
  }, icone('banco', 30), el('span', {}, 'Banqueiro'));

  const corpoRanking = el('div', { class: 'ranking-corpo' });
  const abas = el('div', { class: 'abas', role: 'tablist' },
    ...[['ricos', 'Mais ricos'], ['empresas', 'Empresas']].map(([id, txt]) =>
      el('button', { class: 'aba', role: 'tab', 'data-aba': id, onclick: () => { abaRanking = id; desenharRanking(); } }, txt)));
  const ranking = el('section', { class: 'painel ranking' }, el('h2', { class: 'painel-titulo' }, 'Ranking'), abas, corpoRanking);

  // --- base: mercado e ajuda ---
  const mercado = criarMercado({
    token, abrirEmpresa: (id) => abrirEmpresa(id), obterInfo: () => info,
    aoMudar: () => { atualizarTudo?.(); ultimoRanking = 0; carregarRanking(); },
  });
  const statusMercado = el('span', { class: 'mercado-status' });
  const btnMercado = el('button', {
    class: 'btn-redondo btn-mercado', 'aria-label': 'Mercado de Ações',
    onclick: () => { raiz.classList.remove('ranking-aberto'); mercado.alternar(); },
  }, icone('mercado', 38), el('span', {}, 'Mercado de Ações'), statusMercado);
  const btnRanking = el('button', {
    class: 'btn-ranking', 'aria-label': 'Ranking',
    onclick: () => { mercado.fechar(); raiz.classList.toggle('ranking-aberto'); },
  }, icone('coroa', 22), el('span', {}, 'Ranking'));
  const btnAjuda = el('button', {
    class: 'btn-ajuda', 'aria-label': 'Ajuda',
    onclick: () => modal({ titulo: 'Como jogar', conteudo: textoAjuda(est.sala), classe: 'modal-largo', botoes: [{ texto: 'Fechar', classe: 'btn-ouro' }] }),
  }, icone('ajuda', 24), el('span', {}, 'Ajuda'));
  const linkAdmin = localStorage.getItem('milionario.admin')
    ? el('a', { class: 'link-admin-jogo', href: 'admin.html', target: '_blank' }, 'Painel do administrador') : null;

  const fundo = el('div', { class: 'cidade-lugar' });
  let cidade = null;
  const raiz = el('main', { class: 'jogo' },
    fundo,
    el('div', { class: 'coluna-esq' }, cartao, inflacao),
    topo,
    el('div', { class: 'coluna-dir' }, btnBanqueiro, ranking),
    btnMercado, btnAjuda, btnRanking, mercado.raiz, linkAdmin);

  // -------------------------------------------------------------------
  function atualizar(novo) {
    est = novo;
    const { eu, sala } = est;
    if (!cidade) {
      cidade = criarCidade({ semente: sala.id, aoClicarEmpresa: abrirEmpresa });
      fundo.replaceWith(cidade.raiz);
      carregarCatalogo();
    }
    foto.src = fotoSrc(eu.foto);
    nome.textContent = eu.nome;
    vCarteira.textContent = real(eu.carteira);
    vCarteira.classList.toggle('negativo', Number(eu.carteira) < 0);
    vPatrimonio.textContent = real(eu.patrimonio);
    btnOlho.replaceChildren(icone(eu.oculto ? 'olhoFechado' : 'olho'));
    btnOlho.setAttribute('aria-label', eu.oculto ? 'Mostrar meus valores no ranking' : 'Ocultar meus valores no ranking');
    btnOlho.classList.toggle('ativo', eu.oculto);
    avisoOculto.hidden = !eu.oculto;

    const cobrancas = (eu.cobrancas || []).map(Number);
    const chaveLinha = `${sala.rodada}|${cobrancas.join(',')}`;
    if (linhaRodadas.dataset.chave !== chaveLinha) {
      linhaRodadas.dataset.chave = chaveLinha;
      linhaRodadas.replaceChildren(...Array.from({ length: 30 }, (_, i) => {
        const n = sala.rodada + i;
        const cobra = cobrancas.includes(n);
        return el('li', { class: 'rodada' + (i === 0 ? ' atual' : '') + (cobra ? ' cobranca' : ''), title: cobra ? 'Cobrança do banqueiro nesta rodada' : null },
          cobra ? el('span', { class: 'cobranca-icone', 'aria-label': 'cobrança' }, 'R$') : null,
          i === 0 ? `Rodada ${n}` : String(n));
      }));
    }
    const dividas = Number(eu.dividas || 0);
    linhaDividas.hidden = dividas <= 0;
    vDividas.textContent = real(dividas);
    if (eu.eliminado) { avisoCarteira.hidden = false; avisoCarteira.textContent = 'Você faliu e está fora da partida.'; }
    else if (Number(eu.carteira) < 0) { avisoCarteira.hidden = false; avisoCarteira.textContent = 'Carteira negativa: venda ações. Ao fechar o mercado o sistema vende por você.'; }
    else avisoCarteira.hidden = true;
    if (Date.now() - ultimoRanking > 3000) carregarRanking();
    if (rodadaInfo !== sala.rodada) carregarInfo(sala.rodada);
    statusMercado.textContent = sala.fase === 'mercado' ? 'Aberto' : 'Leilões';
    if (sala.fase === 'leiloes' && leiloesAbertos !== sala.rodada) {
      leiloesAbertos = sala.rodada;
      raiz.classList.remove('ranking-aberto');
      mercado.abrirLeiloes();
      toast('O mercado fechou: os leilões começaram!', 'info');
    }
    btnMercado.classList.toggle('fechado', sala.fase !== 'mercado');
    mercado.atualizar();
  }

  async function carregarInfo(r) {
    rodadaInfo = r;
    try {
      const i = await obterRodada(est.sala.id, r);
      if (rodadaInfo !== r) return;
      info = i;
      if (i.noticias.length) preencherFaixa(i.noticias.map((n) => `${(CATEGORIAS[n.categoria]?.nome || '').toUpperCase()}: ${n.texto}`).join('   ·   ') + '   ·   ');
      if (i.inflacao !== null && i.inflacao !== undefined) {
        vInflacao.textContent = fmtPct(Number(i.inflacao), 2);
        const d = i.inflacao_ant === null || i.inflacao_ant === undefined ? 0 : Number(i.inflacao) - Number(i.inflacao_ant);
        vInflacaoVar.textContent = Math.abs(d) < 0.005 ? '' : `${d > 0 ? '▲' : '▼'} ${fmtPct(Math.abs(d), 2)}`;
        vInflacaoVar.className = 'inflacao-var ' + (d > 0 ? 'ruim' : 'bom');
        vInflacao.classList.toggle('deflacao', Number(i.inflacao) < 0);
        vDesemprego.textContent = `Desemprego: país ${fmtPct(Number(i.desemprego_br))} · Neópolis ${fmtPct(Number(i.desemprego_local))}`;
      }
    } catch { rodadaInfo = null; }
  }

  // Notícias → relatório (chamado pela tela da partida a cada rodada nova)
  async function abrirNovidades(inicio = 'noticias', aoFechar) {
    if (!est || document.querySelector('.modal-noticias, .modal-relatorio')) return;
    try {
      const i = info && info.rodada === est.sala.rodada ? info : await obterRodada(est.sala.id, est.sala.rodada);
      if (!i.noticias.length) { aoFechar?.(); return; }
      mostrarNovidades(i, { inicio, aoFechar });
    } catch (e) { toast(e.message, 'erro'); }
  }

  async function carregarRanking() {
    if (buscandoRanking || !est) return;
    buscandoRanking = true; ultimoRanking = Date.now();
    try {
      dadosRanking = await rpc('ranking', { p_sala: est.sala.id });
      const ids = dadosRanking.ricos.map((r) => r.id);
      await garantirFotos(est.sala.id, ids);
      cidade?.atualizarEmpresas(dadosRanking.empresas, todasFotos());
      desenharRanking();
    }
    catch { /* próxima atualização tenta de novo */ }
    finally { buscandoRanking = false; }
  }

  function desenharRanking() {
    abas.querySelectorAll('.aba').forEach((b) => {
      const sel = b.dataset.aba === abaRanking;
      b.classList.toggle('ativa', sel); b.setAttribute('aria-selected', sel);
    });
    if (!dadosRanking) return;
    if (abaRanking === 'ricos') {
      corpoRanking.replaceChildren(...dadosRanking.ricos.map((r) => el('div', { class: 'rank-linha' + (r.id === est.eu.id ? ' sou-eu' : '') },
        el('span', { class: 'rank-pos' }, `${r.posicao}º`),
        el('img', { class: 'rank-foto', src: fotoDe(r.id), alt: '' }),
        el('div', { class: 'rank-info' },
          el('strong', {}, r.nome),
          r.oculto
            ? el('span', { class: 'rank-sub oculto' }, 'Valores ocultos')
            : el('span', { class: 'rank-sub' + (r.eliminado ? ' oculto' : '') }, r.eliminado ? 'Faliu' : [`Carteira ${realCompacto(r.carteira)}`, `Patrimônio ${realCompacto(r.patrimonio)}`, Number(r.dividas) > 0 ? `Dívidas ${realCompacto(r.dividas)}` : null].filter(Boolean).map((t) => t.replace(/ /g, '\u00a0')).join(' · '))),
        el('span', { class: 'rank-total' }, r.oculto ? '••••' : 'R$ ' + realCompacto(r.total)))));
    } else {
      corpoRanking.replaceChildren(...dadosRanking.empresas.map((e) => el('button', { class: 'rank-linha rank-botao', onclick: () => { cidade?.focar(e.id); abrirEmpresa(e.id); } },
        el('span', { class: 'rank-pos' }, `${e.posicao}º`),
        el('img', { class: 'rank-selo', src: marca(e.id), alt: '' }),
        el('div', { class: 'rank-info' },
          el('strong', {}, e.nome),
          el('span', { class: 'rank-sub' }, e.dono_nome ? `Dono: ${e.dono_nome} · ${e.acoes_dono} ações` : 'Disponível')),
        el('div', { class: 'rank-valores' },
          el('span', { class: 'rank-total' }, real(e.preco)),
          el('span', { class: 'rank-mini' }, 'por ação')))));
    }
  }

  async function alternarOculto() {
    btnOlho.disabled = true;
    try {
      const eu = await rpc('alternar_oculto', { p_token: token() });
      atualizar({ ...est, eu: { ...est.eu, ...eu, sala: est.sala } });
      ultimoRanking = 0; carregarRanking();
    } catch (e) { toast(e.message, 'erro'); }
    btnOlho.disabled = false;
  }

  function abrirProgresso() {
    const { eu, sala } = est;
    const total = Number(eu.carteira) + Number(eu.patrimonio) - Number(eu.dividas || 0);
    const falta = Math.max(0, Number(sala.meta) - total);
    const pct = Math.max(0, Math.min(100, (total / Number(sala.meta)) * 100));
    modal({
      titulo: 'Rumo ao milhão',
      conteudo: el('div', { class: 'progresso' },
        el('div', { class: 'progresso-linha' }, el('span', {}, 'Carteira + patrimônio'), el('strong', {}, real(Number(eu.carteira) + Number(eu.patrimonio)))),
        el('div', { class: 'progresso-linha' }, el('span', {}, 'Dívidas'), el('strong', {}, real(eu.dividas || 0))),
        el('div', { class: 'progresso-linha destaque' }, el('span', {}, 'Total'), el('strong', {}, real(total))),
        el('div', { class: 'progresso-linha' }, el('span', {}, 'Alvo'), el('strong', {}, real(sala.meta))),
        el('div', { class: 'barra' }, el('div', { class: 'barra-cheia', style: `width:${pct.toFixed(1)}%` })),
        el('p', { class: 'progresso-falta' }, falta > 0 ? `Faltam ${real(falta)} (${pct.toFixed(1).replace('.', ',')}% do caminho)` : 'Você chegou ao alvo!')),
      botoes: [{ texto: 'Fechar', classe: 'btn-ouro' }],
    });
  }

  async function abrirEmpresa(id) {
    const cat = (await carregarCatalogo())[id] || {};
    const e = dadosRanking?.empresas.find((x) => x.id === id) || {};
    const nomeEmp = e.nome || cat.nome || id;
    const dono = e.dono_id
      ? el('div', { class: 'empresa-dono' },
        el('img', { src: fotoDe(e.dono_id), alt: '' }),
        el('div', {}, el('strong', {}, e.dono_nome), el('span', {}, `${e.acoes_dono} ${e.acoes_dono === 1 ? 'ação' : 'ações'} · ${real(e.valor)}`)))
      : el('div', { class: 'empresa-dono livre' }, el('span', { class: 'chip chip-ok' }, 'Disponível'), el('span', {}, 'Ainda não tem dono.'));
    modal({
      classe: 'modal-empresa',
      conteudo: el('div', { class: 'empresa-cartao' },
        el('img', { class: 'empresa-logo', src: logo(id, nomeEmp), alt: nomeEmp }),
        el('div', { class: 'empresa-info' },
          el('span', { class: 'empresa-setor', style: `--cor:${SETORES[cat.setor || e.setor]?.cor || '#888'}` }, SETORES[cat.setor || e.setor]?.nome || ''),
          el('h2', { class: 'modal-titulo' }, nomeEmp),
          el('p', { class: 'texto-suave' }, cat.descricao || ''),
          el('div', { class: 'progresso-linha' }, el('span', {}, 'Valor de 1 ação'), el('strong', {}, real(e.preco ?? cat.preco_inicial))),
          dono,
          historicoEmpresa(id),
          el('p', { class: 'texto-mini' }, 'Para disputar esta empresa, use o Mercado de Ações.'))),
      botoes: [{ texto: 'Fechar', classe: 'btn-ouro' }],
    });
  }

  function historicoEmpresa(id) {
    const emp = info?.empresas.find((x) => x.id === id);
    const serie = (emp?.serie || []).map(Number);
    if (serie.length < 1) return null;
    const linhas = serie.map((v, i) => ({ r: i, v, pct: i ? (v / serie[i - 1] - 1) * 100 : null })).reverse();
    return el('div', { class: 'empresa-historico' },
      el('h3', {}, 'Preço de 1 ação por rodada'),
      graficoPreco(serie),
      el('details', {},
        el('summary', {}, 'Ver os valores de cada rodada'),
        el('table', { class: 'tabela-precos' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Rodada'), el('th', {}, 'Preço'), el('th', {}, 'Variação'))),
          el('tbody', {}, linhas.map((l) => el('tr', {},
            el('td', {}, l.r === 0 ? 'Início' : `${l.r}ª`), el('td', {}, real(l.v)), el('td', {}, l.pct === null ? '—' : variacao(l.pct))))))));
  }

  return { raiz, atualizar, abrirNovidades, desmontar: () => cidade?.destruir() };
}
