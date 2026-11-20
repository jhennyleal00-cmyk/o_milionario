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
      el('li', {}, 'No fim do jogo aparece um pódio com o 1º, o 2º e o 3º lugar, e os mesmos critérios de desempate valem para essas posições.'),
      el('li', {}, 'As notícias de cada rodada mexem nos preços no começo da rodada seguinte. Leia e se prepare!'),
      el('li', {}, 'A cada 5 rodadas tem presente aos acionistas: cada empresa dá ao dono 20% do valor das ações dele, em dinheiro.')));
}

export function textoAjuda(sala) {
  const bloco = (titulo, texto) => el('section', { class: 'ajuda-bloco' }, el('h3', {}, titulo), el('p', {}, texto));
  const grupo = sala.modo === 'grupo';
  return el('div', { class: 'ajuda' },
    grupo
      ? bloco('Objetivo (modo grupo)', `O grupo vence quando a soma de carteira e patrimônio de todos os membros, sem as dívidas, chegar a ${real(sala.meta)} vezes o número de membros (num grupo de 4, ${real(Number(sala.meta) * 4)}). Também vence o último grupo que sobrar. Todos começam com ${real(sala.capital_inicial)}.`)
      : bloco('Objetivo', `Chegar a ${real(sala.meta)} somando carteira e patrimônio, sem dívidas. Todos começam com ${real(sala.capital_inicial)}.`),
    grupo ? bloco('Grupos de acionistas', 'Uma empresa comprada por alguém do grupo é de todos os membros: qualquer um pode comprar mais ações dela e vender as próprias ações, e cada um ganha ou perde com as ações que tem. A empresa só deixa de ser do grupo quando todos os membros saem dela. Nos prédios aparece a foto de todos do grupo.') : null,
    grupo ? bloco('Enviar dinheiro', 'O botão “Enviar dinheiro” (no seu cartão e no Mercado de Ações) manda dinheiro para um colega do grupo a qualquer hora, inclusive durante os leilões. Todas as transferências aparecem no fórum.') : null,
    grupo ? bloco('Leilão de empresa do grupo', 'Quando uma empresa do grupo vai a leilão, só o líder participa. Se o líder não tem ações dela, vai quem tem mais ações; se dois têm o mesmo tanto, vão os dois. Quem cobre o lance fica com as ações a mais.') : null,
    grupo ? bloco('Falência do grupo', 'Se um membro ficar sem nada na carteira e sem nenhuma ação, o grupo inteiro perde e sai do jogo. Por isso o jogo não deixa ninguém mandar todo o dinheiro e ficar sem ações.') : null,
    bloco('Rodadas', 'Cada rodada começa com as mensagens: 4 notícias (Mundo, Política Nacional, Obras e Serviços, Sorte ou Revés), o balanço geral e o ranking. Depois o Mercado de Ações abre para os negócios e, quando todos finalizam, começam os leilões. O botão Mensagens mostra tudo de novo.'),
    bloco('Presente aos acionistas', grupo
      ? 'A cada 5 rodadas (5ª, 10ª, 15ª…), cada empresa do grupo dá um presente de 20% do valor das ações do grupo nela, dividido igualmente entre os membros, direto na carteira.'
      : 'A cada 5 rodadas (5ª, 10ª, 15ª…), cada empresa com dono dá ao dono um presente de 20% do valor das ações dele, direto na carteira. As rodadas com presente têm um ícone na linha das rodadas.'),
    bloco('Empresas', 'Para ser dono de uma empresa, aperte “Disputar” no Mercado de Ações, no cartão da empresa ou direto no leilão que já está aberto. Os lances são em quantidade de ações. Cada empresa tem um só dono, e só o dono compra e vende as ações dela. As suas ficam em “Minhas empresas”, na tela inicial e no mercado.'),
    bloco('Leilões', 'Depois de cada lance, os outros têm 20 segundos para cobrir. Para tomar a empresa de alguém, o lance precisa ter pelo menos 1 ação a mais do que o dono tem.'),
    bloco('Pedir tempo', 'No leilão, o botão “Pedir tempo” para o relógio por 30 segundos. Cada jogador pode pedir uma vez em cada leilão (os bots não pedem).'),
    bloco('Banqueiro', 'Empresta dinheiro com juros que acompanham a inflação (nunca abaixo de 18%). A cobrança sai da carteira na rodada marcada no contrato.'),
    bloco('Notícias e inflação', 'As notícias de uma rodada mexem nos preços no começo da rodada seguinte: na 1ª rodada os preços são os da tabela inicial. A inflação e a procura dos jogadores pelas ações também fazem os preços subir ou cair. Leia as notícias e se prepare.'),
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
