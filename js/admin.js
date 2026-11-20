// Painel do administrador: criar sala (individual ou em grupos), ver quem entrou,
// montar os grupos, iniciar, remover, encerrar.
// Só abre nos aparelhos liberados (o primeiro que entrar vira o do administrador).
import { rpc, ouvirSala } from './db.js';
import { $, el, toast, confirmar, marca, fundoCidade, icone, real, modal } from './ui.js';
import { fotoSrc, AVATARES } from './avatares.js';

const CHAVE = 'milionario.admin';
const APARELHO = 'milionario.aparelho';   // chave secreta deste aparelho (só existe depois de entrar)
const app = $('#app');
document.documentElement.style.setProperty('--cidade', fundoCidade());
let pararOuvir = null, salaOuvida = null, laco = null, ultimoPainel = null;
// grupo sendo montado (sobrevive às atualizações do painel)
const rascunho = { nome: '', membros: new Set(), lider: null };

const admin = () => localStorage.getItem(CHAVE);
const linkJogo = () => new URL('./', location.href).href;

function sair(msg) {
  const t = admin();
  localStorage.removeItem(CHAVE);
  if (t) rpc('admin_sair', { p_admin: t }).catch(() => {});
  clearInterval(laco); pararOuvir?.(); pararOuvir = null; salaOuvida = null;
  telaInicio(msg);
}

function novaChave() {
  const b = new Uint8Array(32); crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function nomeAparelho() {
  const ua = navigator.userAgent;
  const sistema = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Celular Android' : 'Tablet Android')
    : /Windows/.test(ua) ? 'Computador Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Computador Linux' : 'Aparelho';
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return nav ? `${sistema} · ${nav}` : sistema;
}

async function telaInicio(msg) {
  let situacao = 'ok';
  try { situacao = await rpc('admin_aparelho', { p_aparelho: localStorage.getItem(APARELHO) || '' }); }
  catch (e) { msg = msg || e.message; }
  if (situacao === 'negado') telaBloqueada(); else telaLogin(msg, situacao === 'livre');
}

// Aparelho que não é do administrador: nem mostra o formulário
function telaBloqueada() {
  app.replaceChildren(el('main', { class: 'tela-centro' }, marca('pequena'),
    el('section', { class: 'cartao login-cartao admin-bloqueio' },
      el('span', { class: 'admin-cadeado' }, icone('cadeado', 34)),
      el('h1', { class: 'titulo-secao' }, 'Área restrita'),
      el('p', { class: 'texto-suave' }, 'Este painel só abre no aparelho do administrador.'),
      el('a', { class: 'btn btn-ouro btn-grande', href: './' }, 'Ir para o jogo'),
      el('button', { class: 'btn btn-link', onclick: () => telaLogin('', false, true) }, 'Sou o administrador e tenho um código de liberação'))));
}

function telaLogin(msg, primeiro = false, comCodigo = false) {
  const senha = el('input', { class: 'campo', type: 'password', id: 'senha', autocomplete: 'current-password', placeholder: 'Senha do administrador' });
  const codigo = el('input', { class: 'campo', id: 'codigo', autocomplete: 'off', placeholder: 'XXXX-XXXX', maxlength: '9', style: 'text-transform: uppercase' });
  const erro = el('p', { class: 'erro', role: 'alert' }, msg || '');
  const botao = el('button', { class: 'btn btn-ouro btn-grande', type: 'submit' }, 'Entrar');
  app.replaceChildren(el('main', { class: 'tela-centro' }, marca('pequena'),
    el('form', {
      class: 'cartao login-cartao',
      onsubmit: async (ev) => {
        ev.preventDefault(); erro.textContent = ''; botao.disabled = true;
        const chave = localStorage.getItem(APARELHO) || novaChave();
        try {
          const r = await rpc('admin_entrar', { p_senha: senha.value, p_aparelho: chave, p_codigo: comCodigo ? codigo.value : null, p_nome: nomeAparelho() });
          if (r.erro) { erro.textContent = r.erro; botao.disabled = false; return; }
          localStorage.setItem(APARELHO, chave);
          localStorage.setItem(CHAVE, r.token);
          iniciarPainel();
          if (r.novo) toast('Este aparelho agora abre o painel do administrador.', 'ok');
        } catch (e) {
          erro.textContent = e.message; botao.disabled = false;
          if (/só abre no aparelho/.test(e.message)) setTimeout(telaBloqueada, 1600);
        }
      },
    },
    el('h1', { class: 'titulo-secao' }, 'Administrador'),
    primeiro ? el('p', { class: 'aviso-caixa' }, 'Primeiro acesso: depois de entrar, o painel passa a abrir só neste aparelho (e nos que você liberar).') : null,
    comCodigo ? [el('label', { class: 'rotulo', for: 'codigo' }, 'Código de liberação'), codigo,
      el('p', { class: 'texto-mini' }, 'Gere o código no painel, no aparelho que já é do administrador (botão “Aparelhos”).')] : null,
    el('label', { class: 'rotulo', for: 'senha' }, 'Senha'), senha, erro, botao,
    comCodigo ? el('button', { class: 'btn btn-link', type: 'button', onclick: telaBloqueada }, 'Voltar') : null)));
  (comCodigo ? codigo : senha).focus();
}

// ---------------------------------------------------------------------
const corpo = el('div', { class: 'admin-corpo' });

function iniciarPainel() {
  app.replaceChildren(el('main', { class: 'admin' },
    el('header', { class: 'admin-topo' }, marca('pequena'),
      el('div', { class: 'admin-acoes' },
        el('a', { class: 'btn btn-fantasma', href: './', target: '_blank' }, 'Abrir o jogo'),
        el('button', { class: 'btn btn-fantasma', onclick: verAparelhos }, icone('aparelho', 18), 'Aparelhos'),
        el('button', { class: 'btn btn-fantasma', onclick: trocarSenha }, 'Trocar senha'),
        el('button', { class: 'btn btn-fantasma', onclick: () => sair() }, icone('sair', 18), 'Sair'))),
    corpo));
  carregar();
  clearInterval(laco);
  laco = setInterval(carregar, 4000);
}

async function chamar(fn, args = {}) {
  try {
    const r = await rpc(fn, { p_admin: admin(), ...args });
    if (r?.saiu) { sair('Este aparelho foi removido. Ele não abre mais o painel.'); return null; }
    desenhar(r);
    return r;
  } catch (e) {
    if (/expirada/.test(e.message)) sair(e.message); else toast(e.message, 'erro');
    return null;
  }
}

async function carregar() {
  try { desenhar(await rpc('admin_painel', { p_admin: admin() })); }
  catch (e) { if (/expirada/.test(e.message)) sair(e.message); }
}

function desenhar(r) {
  if (!r) return;
  ultimoPainel = r;
  const { sala, jogadores } = r;
  if ((sala?.id || null) !== salaOuvida) {
    pararOuvir?.(); pararOuvir = null; salaOuvida = sala?.id || null;
    if (salaOuvida) pararOuvir = ouvirSala(salaOuvida, carregar);
  }
  if (!sala) return desenharSemSala(r.ultima);
  if (document.activeElement && corpo.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;

  const prontos = jogadores.filter((j) => j.pronto).length;
  const modoGrupo = sala.modo === 'grupo';
  const grupos = r.grupos || [];
  const nomeGrupo = (gid) => grupos.find((g) => g.id === gid)?.nome;
  const statusTxt = sala.status === 'lobby' ? 'Aguardando jogadores' : `Em jogo · ${sala.rodada}ª rodada`;
  corpo.replaceChildren(
    el('section', { class: 'cartao admin-sala' },
      el('div', { class: 'admin-sala-topo' },
        el('h1', { class: 'titulo-secao' }, 'Sala aberta'),
        el('span', { class: 'chip ' + (sala.status === 'lobby' ? 'chip-espera' : 'chip-ok') }, statusTxt)),
      el('dl', { class: 'admin-dados' },
        el('dt', {}, 'Capital inicial'), el('dd', {}, real(sala.capital_inicial)),
        el('dt', {}, 'Meta'), el('dd', {}, real(sala.meta) + (modoGrupo ? ' por pessoa do grupo' : '')),
        el('dt', {}, 'Modo'), el('dd', {}, modoGrupo ? 'Em grupos' : 'Individual',
          sala.status === 'lobby' ? el('button', {
            class: 'btn btn-mini btn-fantasma admin-trocar-modo',
            onclick: async () => {
              const txt = modoGrupo ? 'Os grupos montados serão desfeitos e cada um joga por si.' : 'Você vai montar os grupos de acionistas antes de começar. A partida só começa pelo botão “Iniciar agora”.';
              if (await confirmar(modoGrupo ? 'Jogar individual?' : 'Jogar em grupos?', txt, 'Mudar')) chamar('admin_definir_modo', { p_modo: modoGrupo ? 'solo' : 'grupo' });
            },
          }, modoGrupo ? 'Mudar para individual' : 'Mudar para grupos') : null),
        el('dt', {}, 'Entrada'), el('dd', {}, sala.entrada_aberta ? 'Aberta' : 'Encerrada'),
        el('dt', {}, 'Jogadores'), el('dd', {}, `${jogadores.length} (${prontos} prontos)`),
        sala.status === 'jogando' ? [
          el('dt', {}, 'Inflação'), el('dd', {}, `${String(sala.inflacao).replace('.', ',')}%`),
          el('dt', {}, 'Juros do banqueiro'), el('dd', {}, `${String(sala.juros).replace('.', ',')}%`),
          el('dt', {}, 'Fase'), el('dd', {}, sala.fase === 'mercado' ? `Mercado aberto · ${jogadores.filter((j) => j.finalizou).length} de ${prontos} finalizaram` : 'Leilões ao vivo'),
        ] : null),
      el('div', { class: 'admin-link' },
        el('span', {}, 'Link para os jogadores'),
        el('code', {}, linkJogo()),
        el('button', {
          class: 'btn btn-fantasma',
          onclick: async () => { try { await navigator.clipboard.writeText(linkJogo()); toast('Link copiado.', 'ok'); } catch { toast('Copie o link manualmente.', 'aviso'); } },
        }, icone('copiar', 18), 'Copiar')),
      el('div', { class: 'admin-botoes' },
        sala.status === 'lobby' ? el('button', {
          class: 'btn btn-ouro', disabled: prontos < 2 || (modoGrupo && !!r.grupos_problema),
          onclick: async () => {
            const faltam = jogadores.length - prontos;
            const ok = await confirmar('Iniciar agora?', modoGrupo
              ? `A partida começa com ${grupos.length} grupos.` + (faltam > 0 ? ` Os ${faltam} que ainda escolhem o avatar ficam de fora.` : '')
              : faltam > 0
              ? `${prontos} jogadores estão prontos. Os ${faltam} que ainda escolhem o avatar continuam podendo entrar até o mercado fechar na 1ª rodada.`
              : `A partida começa com ${prontos} jogadores.`, 'Iniciar');
            if (ok) chamar('admin_iniciar_agora');
          },
        }, 'Iniciar agora') : null,
        sala.status === 'jogando' ? el('button', {
          class: 'btn btn-ouro',
          onclick: async () => {
            const mercadoAberto = sala.fase === 'mercado';
            const txt = mercadoAberto
              ? 'O mercado fecha agora, mesmo para quem não finalizou. Se houver disputas, os leilões começam; se não, já começa a próxima rodada.'
                + (sala.entrada_aberta ? ' A partir daí ninguém mais entra na partida.' : '')
              : `Os leilões que faltam terminam agora, com o lance que estiver valendo, e todos vão para a ${sala.rodada + 1}ª rodada.`;
            if (await confirmar(mercadoAberto ? 'Fechar o mercado?' : 'Encerrar os leilões?', txt, mercadoAberto ? 'Fechar' : 'Encerrar')) chamar('admin_avancar_rodada');
          },
        }, sala.fase === 'mercado' ? 'Fechar o mercado' : `Encerrar os leilões (ir para a ${sala.rodada + 1}ª rodada)`) : null,
        el('button', {
          class: 'btn btn-perigo',
          onclick: async () => {
            const txt = sala.status === 'jogando'
              ? 'A partida termina agora para todos e aparece o pódio com a situação do momento. Não há como desfazer.'
              : 'A sala é fechada e ninguém mais entra. Não há como desfazer.';
            if (await confirmar(sala.status === 'jogando' ? 'Encerrar a partida?' : 'Encerrar a sala?', txt, 'Encerrar')) chamar('admin_encerrar_sala');
          },
        }, 'Encerrar sala'))),
    modoGrupo ? secaoGrupos(r) : null,
    el('section', { class: 'cartao admin-jogadores' },
      el('h2', { class: 'titulo-secao' }, 'Jogadores'),
      jogadores.length === 0 ? el('p', { class: 'texto-suave' }, 'Ninguém entrou ainda. Envie o link aos jogadores.') : null,
      sala.status === 'lobby' ? botoesBots(jogadores) : null,
      el('ul', { class: 'admin-lista' }, ...jogadores.map((j) => el('li', {},
        el('img', { src: j.pronto ? fotoSrc(j.foto) : AVATARES[0], alt: '', class: j.pronto ? '' : 'apagado' }),
        el('span', { class: 'admin-nome' }, j.nome || 'Escolhendo avatar…', j.bot ? el('span', { class: 'selo-bot' }, icone('robo', 13), 'Bot') : null,
          modoGrupo && j.grupo_id ? el('span', { class: 'selo-grupo' }, icone('grupo', 13), nomeGrupo(j.grupo_id)) : null),
        el('span', { class: 'ponto ' + (j.online ? 'online' : 'offline'), title: j.online ? 'Conectado' : 'Desconectado' }),
        el('span', { class: 'chip ' + (j.pronto ? 'chip-ok' : 'chip-espera') }, j.pronto ? 'Pronto' : 'Escolhendo'),
        el('button', {
          class: 'btn btn-mini btn-perigo',
          onclick: async () => {
            if (await confirmar(j.bot ? 'Tirar o bot?' : 'Remover jogador?', `${j.nome || 'Este jogador'} sai da sala. As empresas dele voltam a ficar disponíveis.`, 'Remover')) {
              chamar('admin_remover_jogador', { p_jogador: j.id });
            }
          },
        }, 'Remover'))))));
}

function desenharSemSala(ultima) {
  if (document.activeElement && corpo.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
  if (corpo.querySelector('.admin-criar')) return;
  const capital = el('input', { class: 'campo', id: 'capital', type: 'number', min: '1000', step: '1000', value: '100000' });
  const meta = el('input', { class: 'campo', id: 'meta', type: 'number', min: '10000', step: '10000', value: '1000000' });
  const marcaBot = (id) => el('input', { type: 'checkbox', id: 'bot-' + id, value: id });
  const modoSolo = el('input', { type: 'radio', name: 'modo', id: 'modo-solo', value: 'solo', checked: true });
  const modoGrupo = el('input', { type: 'radio', name: 'modo', id: 'modo-grupo', value: 'grupo' });
  const bots = BOTS.map((b) => ({ ...b, caixa: marcaBot(b.id) }));
  const resumo = ultima ? el('section', { class: 'cartao admin-ultima' },
    el('h2', { class: 'titulo-secao' }, 'Última partida'),
    el('p', {}, ultima.texto),
    el('ol', { class: 'admin-ultima-lista' }, (ultima.classificacao || []).slice(0, 3).map((c) =>
      el('li', {}, el('strong', {}, `${c.posicao}º ${c.nome}`), ` · ${real(c.total)}${c.eliminado ? ' (faliu)' : ''}`))),
    el('p', { class: 'texto-mini' }, `${ultima.rodada} rodadas`)) : null;
  corpo.replaceChildren(...[resumo, el('form', {
    class: 'cartao admin-criar',
    onsubmit: async (ev) => {
      ev.preventDefault();
      corpo.replaceChildren();
      await chamar('admin_criar_sala', { p_capital: Number(capital.value), p_meta: Number(meta.value), p_bots: bots.filter((b) => b.caixa.checked).map((b) => b.id),
        p_modo: modoGrupo.checked ? 'grupo' : 'solo' });
    },
  },
  el('h1', { class: 'titulo-secao' }, 'Nenhuma sala criada'),
  el('p', { class: 'texto-suave' }, 'Crie uma sala e envie o link. Quem abrir o link verá o botão “Entrar no jogo”.'),
  el('div', { class: 'admin-campos' },
    el('label', { class: 'rotulo', for: 'capital' }, 'Capital inicial de cada jogador (R$)'), capital,
    el('label', { class: 'rotulo', for: 'meta' }, 'Meta para vencer (R$)'), meta),
  el('fieldset', { class: 'admin-modos' },
    el('legend', { class: 'rotulo' }, 'Modo de jogo'),
    el('label', { class: 'admin-modo', for: 'modo-solo' }, modoSolo,
      el('span', {}, el('strong', {}, 'Individual'), el('small', {}, 'Cada um joga por si. Vence quem chegar primeiro à meta.'))),
    el('label', { class: 'admin-modo', for: 'modo-grupo' }, modoGrupo,
      el('span', {}, el('strong', {}, 'Em grupos'), el('small', {}, 'Grupos de acionistas do mesmo tamanho, com líder. Os colegas dividem as empresas e mandam dinheiro uns aos outros. O grupo vence quando a soma chega à meta × membros.')))),
  el('fieldset', { class: 'admin-bots' },
    el('legend', { class: 'rotulo' }, 'Bots para jogar com você'),
    ...bots.map((b) => el('label', { class: 'admin-bot', for: 'bot-' + b.id }, b.caixa,
      el('img', { src: fotoSrc(b.foto), alt: '' }),
      el('span', {}, el('strong', {}, b.nome), el('small', {}, b.jeito))))),
  el('button', { class: 'btn btn-ouro btn-grande', type: 'submit' }, 'Criar sala'))].filter(Boolean));
}

// ---------------------------------------------------------------------
// Grupos de acionistas (modo grupo)
// ---------------------------------------------------------------------
function secaoGrupos(r) {
  const { sala, jogadores } = r;
  const grupos = r.grupos || [];
  const lobby = sala.status === 'lobby';
  const porId = Object.fromEntries(jogadores.map((j) => [j.id, j]));
  const pessoa = (id, lider) => {
    const j = porId[id];
    return el('li', { class: lider ? 'lider' : '' },
      el('img', { src: j?.foto ? fotoSrc(j.foto) : AVATARES[0], alt: '' }),
      el('span', {}, j?.nome || '—'), lider ? el('span', { class: 'chip chip-ok' }, icone('coroa', 12), 'líder') : null,
      j?.bot ? el('span', { class: 'selo-bot' }, icone('robo', 12)) : null);
  };
  const lista = grupos.length ? el('div', { class: 'admin-grupos-lista' }, grupos.map((g) => el('div', { class: 'admin-grupo' },
    el('header', {}, icone('grupo', 18), el('strong', {}, g.nome), el('span', { class: 'texto-mini' }, `${g.membros.length} pessoas`),
      lobby ? el('button', {
        class: 'btn btn-mini btn-perigo',
        onclick: async () => { if (await confirmar(`Desfazer o grupo ${g.nome}?`, 'Os membros ficam sem grupo e podem ir para outro.', 'Desfazer')) chamar('admin_excluir_grupo', { p_grupo: g.id }); },
      }, 'Desfazer') : null),
    el('ul', { class: 'admin-grupo-membros' }, g.membros.map((id) => pessoa(id, id === g.lider_id))))))
    : el('p', { class: 'texto-suave' }, 'Nenhum grupo ainda.');
  if (!lobby) return el('section', { class: 'cartao admin-grupos' }, el('h2', { class: 'titulo-secao' }, 'Grupos de acionistas'), lista);

  // montar um grupo novo: nome, membros (só quem está pronto e sem grupo) e líder
  const livres = jogadores.filter((j) => j.pronto && j.nome && !j.grupo_id);
  for (const id of [...rascunho.membros]) if (!livres.some((j) => j.id === id)) rascunho.membros.delete(id);
  if (rascunho.lider && !rascunho.membros.has(rascunho.lider)) rascunho.lider = null;
  const nome = el('input', { class: 'campo', id: 'grupo-nome', maxlength: '30', placeholder: 'Ex.: Águias', value: rascunho.nome });
  nome.addEventListener('input', () => { rascunho.nome = nome.value; });
  const tamanhos = [...new Set(grupos.map((g) => g.membros.length))];
  const dica = tamanhos.length === 1 ? `Os outros grupos têm ${tamanhos[0]} pessoas.` : '';
  const form = el('div', { class: 'admin-grupo-novo' },
    el('h3', {}, 'Novo grupo'),
    el('label', { class: 'rotulo', for: 'grupo-nome' }, 'Nome do grupo'), nome,
    el('p', { class: 'rotulo' }, 'Membros (pelo menos 2) e líder ', el('span', { class: 'texto-mini' }, dica)),
    livres.length ? el('ul', { class: 'admin-escolher' }, livres.map((j) => {
      const marcado = rascunho.membros.has(j.id);
      return el('li', { class: marcado ? 'marcado' : '' },
        el('label', {},
          el('input', { type: 'checkbox', checked: marcado, onchange: (e) => {
            if (e.target.checked) { rascunho.membros.add(j.id); if (!rascunho.lider) rascunho.lider = j.id; }
            else { rascunho.membros.delete(j.id); if (rascunho.lider === j.id) rascunho.lider = [...rascunho.membros][0] || null; }
            e.target.blur(); desenhar(ultimoPainel);
          } }),
          el('img', { src: fotoSrc(j.foto), alt: '' }), el('span', {}, j.nome), j.bot ? el('span', { class: 'selo-bot' }, icone('robo', 12)) : null),
        marcado ? el('button', {
          class: 'btn btn-mini ' + (rascunho.lider === j.id ? 'btn-ouro' : 'btn-fantasma'),
          onclick: () => { rascunho.lider = j.id; desenhar(ultimoPainel); },
        }, icone('coroa', 12), rascunho.lider === j.id ? 'Líder' : 'Tornar líder') : null);
    })) : el('p', { class: 'texto-suave' }, 'Todos os jogadores prontos já estão em grupos. Coloque bots ou espere mais gente entrar.'),
    el('button', {
      class: 'btn btn-ouro', disabled: rascunho.membros.size < 2 || !rascunho.lider,
      onclick: async () => {
        const nm = (rascunho.nome || nome.value).trim();
        if (!nm) { toast('Dê um nome ao grupo.', 'aviso'); nome.focus(); return; }
        const r2 = await chamar('admin_criar_grupo', { p_nome: nm, p_membros: [...rascunho.membros], p_lider: rascunho.lider });
        if (r2) { rascunho.nome = ''; rascunho.membros.clear(); rascunho.lider = null; desenhar(r2); toast(`Grupo ${nm} criado.`, 'ok'); }
      },
    }, icone('grupo', 16), 'Criar grupo'));
  return el('section', { class: 'cartao admin-grupos' },
    el('h2', { class: 'titulo-secao' }, 'Grupos de acionistas'),
    el('p', { class: 'texto-suave' }, 'Todos os grupos precisam ter o mesmo número de pessoas, e cada grupo tem um líder. Todos os jogadores prontos precisam estar num grupo.'),
    r.grupos_problema ? el('p', { class: 'admin-aviso' }, icone('info', 16), r.grupos_problema)
      : el('p', { class: 'admin-ok' }, `Tudo pronto: ${grupos.length} grupos de ${grupos[0]?.membros.length || 0} pessoas. Já pode iniciar.`),
    lista, form);
}

// ---------------------------------------------------------------------
// Bots
// ---------------------------------------------------------------------
const BOTS = [
  { id: 'jake', nome: 'Jake', foto: 'preset:6', jeito: 'Analítico e cuidadoso: estuda os preços, diversifica, guarda dinheiro e só pega empréstimo com juros baixo.' },
  { id: 'juliana', nome: 'Juliana', foto: 'preset:3', jeito: 'Intuitiva, mas controlada: aposta no que está subindo quando as notícias confirmam, guarda reserva e não se afoba nos leilões.' },
  { id: 'don', nome: 'Don', foto: 'preset:8', jeito: 'Ousado e estratégico: aposta alto com cálculo, concentra nas melhores empresas, ataca donos sem caixa e se prepara para o presente aos acionistas.' },
  { id: 'lee', nome: 'Lee', foto: 'preset:14', jeito: 'O mais forte (nível avançado): lê as notícias quase sem errar, só age quando a conta fecha, ataca quem não tem caixa para defender e dá o lance decisivo nos últimos segundos.' },
];

function botoesBots(jogadores) {
  const faltam = BOTS.filter((b) => !jogadores.some((j) => j.bot === b.id));
  if (!faltam.length) return null;
  return el('div', { class: 'admin-botoes-bots' }, faltam.map((b) => el('button', {
    class: 'btn btn-fantasma btn-mini',
    onclick: () => chamar('admin_colocar_bot', { p_perfil: b.id }),
  }, icone('robo', 16), `Colocar ${b.nome}`)));
}

// ---------------------------------------------------------------------
// Aparelhos que abrem o painel
// ---------------------------------------------------------------------
const quando = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function verAparelhos() {
  const lista = el('ul', { class: 'admin-aparelhos' });
  const areaCodigo = el('div', { class: 'admin-codigo' });
  const desenharLista = (r) => {
    const aps = r?.aparelhos || [];
    lista.replaceChildren(...aps.map((a) => el('li', {},
      el('span', { class: 'admin-aparelho-icone' }, icone('aparelho', 18)),
      el('span', {}, el('strong', {}, a.nome), el('small', {}, `Liberado em ${quando(a.criado_em)} · último uso ${quando(a.usado_em)}`)),
      a.este ? el('span', { class: 'chip chip-ok' }, 'Este aparelho') : el('button', {
        class: 'btn btn-mini btn-perigo',
        onclick: async () => {
          if (!(await confirmar('Remover este aparelho?', `${a.nome} não vai mais abrir o painel.`, 'Remover'))) return;
          const r2 = await chamar('admin_remover_aparelho', { p_id: a.id });
          if (r2) desenharLista(r2);
        },
      }, 'Remover'))));
  };
  desenharLista(ultimoPainel);
  modal({
    titulo: 'Aparelhos do administrador',
    classe: 'modal-aparelhos',
    conteudo: el('div', { class: 'pilha' },
      el('p', { class: 'texto-suave' }, 'Só estes aparelhos abrem o painel. Em qualquer outro aparece “Área restrita”, mesmo com a senha.'),
      lista, areaCodigo,
      el('button', {
        class: 'btn btn-ouro',
        onclick: async () => {
          try {
            const r = await rpc('admin_gerar_codigo', { p_admin: admin() });
            areaCodigo.replaceChildren(
              el('p', {}, 'No outro aparelho, abra o painel, toque em “Sou o administrador e tenho um código de liberação” e digite:'),
              el('code', { class: 'admin-codigo-valor' }, r.codigo),
              el('p', { class: 'texto-mini' }, `Vale uma vez, até ${new Date(r.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Também pede a senha.`));
          } catch (e) { if (/expirada/.test(e.message)) sair(e.message); else toast(e.message, 'erro'); }
        },
      }, 'Liberar outro aparelho')),
    botoes: [{ texto: 'Fechar', classe: 'btn-fantasma' }],
  });
}

function trocarSenha() {
  const atual = el('input', { class: 'campo', type: 'password', placeholder: 'Senha atual' });
  const nova = el('input', { class: 'campo', type: 'password', placeholder: 'Nova senha (mínimo 6)' });
  modal({
    titulo: 'Trocar senha', conteudo: el('div', { class: 'pilha' }, atual, nova),
    botoes: [
      { texto: 'Cancelar', classe: 'btn-fantasma' },
      {
        texto: 'Salvar', classe: 'btn-ouro', acao: async (f) => {
          try {
            await rpc('admin_trocar_senha', { p_admin: admin(), p_atual: atual.value, p_nova: nova.value });
            f(); sair('Senha trocada. Entre com a nova senha.');
          } catch (e) { toast(e.message, 'erro'); }
        },
      },
    ],
  });
}

if (admin() && localStorage.getItem(APARELHO)) iniciarPainel(); else telaInicio();
