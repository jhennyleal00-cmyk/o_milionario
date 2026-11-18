// Textos fixos: mensagem inicial e botão de ajuda.
import { el, real, modal } from './ui.js';
import { marca } from './logos.js';

export const SETORES = {
  energia:    { nome: 'Energia & Combustível',  cor: '#f2b234' },
  tecnologia: { nome: 'Tecnologia & Automação', cor: '#4fa3ff' },
  varejo:     { nome: 'Varejo',                 cor: '#ff7a59' },
  financas:   { nome: 'Finanças',               cor: '#3ccf8e' },
  recursos:   { nome: 'Recursos & Construção',  cor: '#c9915a' },
  saude:      { nome: 'Recreação e Bem-estar',  cor: '#e45a9b' },
};

export function textoInstrucoes(sala) {
  return el('div', { class: 'instrucoes' },
    el('p', {}, `O seu objetivo neste jogo é se tornar um milionário, sem nenhuma dívida. Quem conseguir primeiro vence. Para isso você começa com ${real(sala.capital_inicial)} na carteira e nenhum patrimônio, por enquanto. Se a soma da sua carteira com o seu patrimônio (ações), descontadas as dívidas, chegar a ${real(sala.meta)}, você venceu. Boa sorte!`),
    el('ul', {},
      el('li', {}, `Se mais de um jogador chegar a ${real(sala.meta)} na virada da rodada, fica em primeiro lugar quem tiver mais dinheiro.`),
      el('li', {}, 'Se houver empate exato no valor, ganha quem tiver mais empresas.'),
      el('li', {}, 'Se o valor e o número de empresas forem iguais, ganha quem tiver a empresa mais valiosa.'),
      el('li', {}, 'No fim do jogo aparece um pódio com o 1º, o 2º e o 3º lugar, e os mesmos critérios de desempate valem para essas posições.')));
}

export function textoAjuda(sala) {
  const bloco = (titulo, texto) => el('section', { class: 'ajuda-bloco' }, el('h3', {}, titulo), el('p', {}, texto));
  return el('div', { class: 'ajuda' },
    bloco('Objetivo', `Chegar a ${real(sala.meta)} somando carteira e patrimônio, sem dívidas. Todos começam com ${real(sala.capital_inicial)}.`),
    bloco('Rodadas', 'Cada rodada começa com 4 notícias (Mundo, Política Nacional, Obras e Serviços, Sorte ou Revés) e o relatório do mercado. Depois o Mercado de Ações abre para os negócios e, quando todos finalizam, começam os leilões.'),
    bloco('Empresas', 'Para ser dono de uma empresa, aperte “Disputar” no Mercado de Ações. Os lances são em quantidade de ações. Cada empresa tem um só dono, e só o dono compra e vende as ações dela.'),
    bloco('Leilões', 'Depois de cada lance, os outros têm 20 segundos para cobrir. Para tomar a empresa de alguém, o lance precisa ter pelo menos 1 ação a mais do que o dono tem.'),
    bloco('Banqueiro', 'Empresta dinheiro com juros que acompanham a inflação (nunca abaixo de 18%). A cobrança sai da carteira na rodada marcada no contrato.'),
    bloco('Notícias e inflação', 'As notícias, a inflação e a procura dos jogadores pelas ações fazem os preços subir ou cair a cada rodada. Fique de olho na faixa de notícias.'),
    bloco('Ranking', 'O ícone de olho no seu cartão esconde os seus valores no ranking. No Mercado de Ações tudo continua visível.'));
}

// Botão "?" com os produtos e serviços da empresa
export function botaoSobre(e) {
  return el('button', {
    class: 'btn-sobre', type: 'button', 'aria-label': `Com o que a ${e.nome} trabalha`, title: 'Produtos e serviços',
    onclick: (ev) => { ev.stopPropagation(); abrirSobre(e); },
  }, '?');
}
export function abrirSobre(e) {
  const setor = SETORES[e.setor];
  modal({
    classe: 'modal-sobre',
    conteudo: el('div', { class: 'sobre' },
      el('img', { src: marca(e.id), alt: '' }),
      el('div', {},
        setor ? el('span', { class: 'empresa-setor', style: `--cor:${setor.cor}` }, setor.nome) : null,
        el('h2', { class: 'modal-titulo' }, e.nome),
        el('p', { class: 'sobre-rotulo' }, 'Produtos e serviços'),
        el('p', {}, e.descricao || 'Sem descrição.'))),
    botoes: [{ texto: 'Fechar', classe: 'btn-ouro' }],
  });
}
