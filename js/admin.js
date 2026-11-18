// Painel do administrador: criar sala, ver quem entrou, iniciar, remover, encerrar.
import { rpc, ouvirSala } from './db.js';
import { $, el, toast, confirmar, marca, fundoCidade, icone, real, modal } from './ui.js';
import { fotoSrc, AVATARES } from './avatares.js';

const CHAVE = 'milionario.admin';
const app = $('#app');
document.documentElement.style.setProperty('--cidade', fundoCidade());
let pararOuvir = null, salaOuvida = null, laco = null;

const admin = () => localStorage.getItem(CHAVE);
const linkJogo = () => new URL('./', location.href).href;

function sair(msg) {
  const t = admin();
  localStorage.removeItem(CHAVE);
  if (t) rpc('admin_sair', { p_admin: t }).catch(() => {});
  clearInterval(laco); pararOuvir?.(); pararOuvir = null; salaOuvida = null;
  telaLogin(msg);
}

function telaLogin(msg) {
  const senha = el('input', { class: 'campo', type: 'password', id: 'senha', autocomplete: 'current-password', placeholder: 'Senha do administrador' });
  const erro = el('p', { class: 'erro', role: 'alert' }, msg || '');
  const botao = el('button', { class: 'btn btn-ouro btn-grande', type: 'submit' }, 'Entrar');
  app.replaceChildren(el('main', { class: 'tela-centro' }, marca('pequena'),
    el('form', {
      class: 'cartao login-cartao',
      onsubmit: async (ev) => {
        ev.preventDefault(); erro.textContent = ''; botao.disabled = true;
        try {
          const r = await rpc('admin_entrar', { p_senha: senha.value });
          if (r.erro) { erro.textContent = r.erro; botao.disabled = false; return; }
          localStorage.setItem(CHAVE, r.token);
          iniciarPainel();
        } catch (e) { erro.textContent = e.message; botao.disabled = false; }
      },
    }, el('h1', { class: 'titulo-secao' }, 'Administrador'), el('label', { class: 'rotulo', for: 'senha' }, 'Senha'), senha, erro, botao)));
  senha.focus();
}

// ---------------------------------------------------------------------
const corpo = el('div', { class: 'admin-corpo' });

function iniciarPainel() {
  app.replaceChildren(el('main', { class: 'admin' },
    el('header', { class: 'admin-topo' }, marca('pequena'),
      el('div', { class: 'admin-acoes' },
        el('a', { class: 'btn btn-fantasma', href: './', target: '_blank' }, 'Abrir o jogo'),
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
  const { sala, jogadores } = r;
  if ((sala?.id || null) !== salaOuvida) {
    pararOuvir?.(); pararOuvir = null; salaOuvida = sala?.id || null;
    if (salaOuvida) pararOuvir = ouvirSala(salaOuvida, carregar);
  }
  if (!sala) return desenharSemSala();
  if (document.activeElement && corpo.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;

  const prontos = jogadores.filter((j) => j.pronto).length;
  const statusTxt = sala.status === 'lobby' ? 'Aguardando jogadores' : `Em jogo · ${sala.rodada}ª rodada`;
  corpo.replaceChildren(
    el('section', { class: 'cartao admin-sala' },
      el('div', { class: 'admin-sala-topo' },
        el('h1', { class: 'titulo-secao' }, 'Sala aberta'),
        el('span', { class: 'chip ' + (sala.status === 'lobby' ? 'chip-espera' : 'chip-ok') }, statusTxt)),
      el('dl', { class: 'admin-dados' },
        el('dt', {}, 'Capital inicial'), el('dd', {}, real(sala.capital_inicial)),
        el('dt', {}, 'Meta'), el('dd', {}, real(sala.meta)),
        el('dt', {}, 'Entrada'), el('dd', {}, sala.entrada_aberta ? 'Aberta' : 'Encerrada'),
        el('dt', {}, 'Jogadores'), el('dd', {}, `${jogadores.length} (${prontos} prontos)`)),
      el('div', { class: 'admin-link' },
        el('span', {}, 'Link para os jogadores'),
        el('code', {}, linkJogo()),
        el('button', {
          class: 'btn btn-fantasma',
          onclick: async () => { try { await navigator.clipboard.writeText(linkJogo()); toast('Link copiado.', 'ok'); } catch { toast('Copie o link manualmente.', 'aviso'); } },
        }, icone('copiar', 18), 'Copiar')),
      el('div', { class: 'admin-botoes' },
        sala.status === 'lobby' ? el('button', {
          class: 'btn btn-ouro', disabled: prontos < 2,
          onclick: async () => {
            const faltam = jogadores.length - prontos;
            const ok = await confirmar('Iniciar agora?', faltam > 0
              ? `${prontos} jogadores estão prontos. Os ${faltam} que ainda escolhem o avatar continuam podendo entrar até o mercado fechar na 1ª rodada.`
              : `A partida começa com ${prontos} jogadores.`, 'Iniciar');
            if (ok) chamar('admin_iniciar_agora');
          },
        }, 'Iniciar agora') : null,
        el('button', {
          class: 'btn btn-perigo',
          onclick: async () => {
            if (await confirmar('Encerrar a sala?', 'A partida termina para todos e não há como desfazer.', 'Encerrar')) chamar('admin_encerrar_sala');
          },
        }, 'Encerrar sala'))),
    el('section', { class: 'cartao admin-jogadores' },
      el('h2', { class: 'titulo-secao' }, 'Jogadores'),
      jogadores.length === 0 ? el('p', { class: 'texto-suave' }, 'Ninguém entrou ainda. Envie o link aos jogadores.') : null,
      el('ul', { class: 'admin-lista' }, ...jogadores.map((j) => el('li', {},
        el('img', { src: j.pronto ? fotoSrc(j.foto) : AVATARES[0], alt: '', class: j.pronto ? '' : 'apagado' }),
        el('span', { class: 'admin-nome' }, j.nome || 'Escolhendo avatar…'),
        el('span', { class: 'ponto ' + (j.online ? 'online' : 'offline'), title: j.online ? 'Conectado' : 'Desconectado' }),
        el('span', { class: 'chip ' + (j.pronto ? 'chip-ok' : 'chip-espera') }, j.pronto ? 'Pronto' : 'Escolhendo'),
        el('button', {
          class: 'btn btn-mini btn-perigo',
          onclick: async () => {
            if (await confirmar('Remover jogador?', `${j.nome || 'Este jogador'} sai da sala. As empresas dele voltam a ficar disponíveis.`, 'Remover')) {
              chamar('admin_remover_jogador', { p_jogador: j.id });
            }
          },
        }, 'Remover'))))));
}

function desenharSemSala() {
  if (document.activeElement && corpo.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
  if (corpo.querySelector('.admin-criar')) return;
  const capital = el('input', { class: 'campo', id: 'capital', type: 'number', min: '1000', step: '1000', value: '100000' });
  const meta = el('input', { class: 'campo', id: 'meta', type: 'number', min: '10000', step: '10000', value: '1000000' });
  corpo.replaceChildren(el('form', {
    class: 'cartao admin-criar',
    onsubmit: async (ev) => {
      ev.preventDefault();
      corpo.replaceChildren();
      await chamar('admin_criar_sala', { p_capital: Number(capital.value), p_meta: Number(meta.value) });
    },
  },
  el('h1', { class: 'titulo-secao' }, 'Nenhuma sala criada'),
  el('p', { class: 'texto-suave' }, 'Crie uma sala e envie o link. Quem abrir o link verá o botão “Entrar no jogo”.'),
  el('div', { class: 'admin-campos' },
    el('label', { class: 'rotulo', for: 'capital' }, 'Capital inicial de cada jogador (R$)'), capital,
    el('label', { class: 'rotulo', for: 'meta' }, 'Meta para vencer (R$)'), meta),
  el('button', { class: 'btn btn-ouro btn-grande', type: 'submit' }, 'Criar sala')));
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

if (admin()) iniciarPainel(); else telaLogin();
