// Fluxo do jogador: início → entrar → avatar → sala de espera → partida.
import { rpc, ouvirSala } from './db.js';
import { $, el, toast, modal, marca, fundoCidade, prepararFoto, icone } from './ui.js';
import { AVATARES, fotoSrc } from './avatares.js';
import { criarPrincipal } from './principal.js';
import { textoInstrucoes } from './regras.js';

const CHAVE = 'milionario.token';
const app = $('#app');
document.documentElement.style.setProperty('--cidade', fundoCidade());

const estado = { sala: null, eu: null };
let telaAtual = null;       // { nome, atualizar?, desmontar? }
let pararOuvir = null, salaOuvida = null;
let falhasSeguidas = 0;

const token = () => localStorage.getItem(CHAVE);

// ---------------------------------------------------------------------
async function atualizar() {
  try {
    const t = token();
    const eu = t ? await rpc('meu_estado', { p_token: t }) : null;
    if (t && !eu) {
      localStorage.removeItem(CHAVE);
      if (estado.eu) toast('Você não está mais nesta sala.', 'aviso');
    }
    estado.eu = eu;
    estado.sala = eu ? eu.sala : await rpc('sala_publica');
    falhasSeguidas = 0;
    $('#sem-conexao')?.remove();
    ouvir();
    decidir();
  } catch (e) {
    falhasSeguidas++;
    if (!telaAtual) mostrar('erro', () => telaErro(e.message));
    else if (falhasSeguidas >= 2 && !$('#sem-conexao')) {
      document.body.append(el('div', { id: 'sem-conexao' }, 'Reconectando ao servidor…'));
    }
  }
}

function ouvir() {
  const id = estado.sala?.id || null;
  if (id === salaOuvida) return;
  pararOuvir?.(); pararOuvir = null; salaOuvida = id;
  if (id) pararOuvir = ouvirSala(id, atualizar);
}

function decidir() {
  const { eu, sala } = estado;
  if (eu && sala?.status === 'encerrada') return mostrar('encerrada', telaEncerrada);
  if (!eu) {
    if (!sala) return mostrar('sem-sala', telaSemSala);
    return sala.entrada_aberta ? mostrar('entrada', telaEntrada) : mostrar('fechada', telaFechada);
  }
  if (!eu.pronto) return mostrar('avatar', telaAvatar);
  if (sala.status === 'lobby') return mostrar('espera', telaEspera);
  return mostrar('jogo', telaJogo);
}

function mostrar(nome, fabrica) {
  if (telaAtual?.nome === nome) { telaAtual.atualizar?.(estado); return; }
  telaAtual?.desmontar?.();
  app.replaceChildren();
  const t = fabrica();
  telaAtual = { nome, ...t };
  app.append(t.raiz);
  telaAtual.atualizar?.(estado);
}

// ---------------------------------------------------------------------
// Telas de início
// ---------------------------------------------------------------------
function capa(...conteudo) {
  return el('main', { class: 'capa' },
    el('div', { class: 'capa-centro' }, marca('grande'), ...conteudo),
    el('a', { class: 'link-admin', href: 'admin.html' }, 'Administrador'));
}

function telaSemSala() {
  return { raiz: capa(el('p', { class: 'capa-aviso' }, 'Nenhuma sala criada para este jogo.')) };
}

function telaFechada() {
  return { raiz: capa(el('p', { class: 'capa-aviso' }, 'Há uma partida em andamento e a entrada já foi encerrada.')) };
}

function telaErro(msg) {
  return {
    raiz: capa(el('p', { class: 'capa-aviso' }, msg),
      el('button', { class: 'btn btn-ouro', onclick: () => location.reload() }, 'Tentar de novo')),
  };
}

function telaEncerrada() {
  return {
    raiz: capa(el('p', { class: 'capa-aviso' }, 'A sala foi encerrada pelo administrador.'),
      el('button', { class: 'btn btn-ouro', onclick: () => { localStorage.removeItem(CHAVE); estado.eu = null; atualizar(); } }, 'Voltar ao início')),
  };
}

function telaEntrada() {
  const info = el('p', { class: 'capa-info' });
  const botao = el('button', {
    class: 'btn btn-ouro btn-grande',
    onclick: async () => {
      botao.disabled = true;
      try {
        const r = await rpc('entrar');
        localStorage.setItem(CHAVE, r.token);
        await atualizar();
      } catch (e) { toast(e.message, 'erro'); botao.disabled = false; }
    },
  }, 'Entrar no jogo');
  return {
    raiz: capa(botao, info),
    atualizar: ({ sala }) => {
      info.textContent = sala.status === 'jogando'
        ? `Partida na ${sala.rodada}ª rodada — ainda dá para entrar.`
        : 'Sala aberta. Entre e escolha o seu avatar.';
    },
  };
}

// ---------------------------------------------------------------------
// Avatar: nome + foto (8 prontas ou do aparelho) → "Começar"
// ---------------------------------------------------------------------
function telaAvatar() {
  const eu = estado.eu;
  let foto = eu.foto || null;
  let fotoPropria = foto && foto.startsWith('data:image/') ? foto : null;

  const nome = el('input', {
    class: 'campo', id: 'nome', maxlength: '18', autocomplete: 'off', placeholder: 'Como você quer ser chamado?',
    value: eu.nome || '',
  });
  const erro = el('p', { class: 'erro', role: 'alert' });
  nome.addEventListener('input', () => { erro.textContent = ''; });
  const grade = el('div', { class: 'avatar-grade' });

  const entradaArquivo = el('input', { type: 'file', accept: 'image/*', hidden: true });
  const opcaoPropria = el('button', { class: 'avatar-opcao avatar-propria', type: 'button', 'aria-label': 'Usar foto do computador ou celular' });

  function desenharGrade() {
    grade.replaceChildren(
      ...AVATARES.map((src, i) => el('button', {
        class: 'avatar-opcao' + (foto === `preset:${i}` ? ' escolhido' : ''), type: 'button',
        'aria-label': `Avatar ${i + 1}`, 'data-avatar': i,
        onclick: () => { foto = `preset:${i}`; erro.textContent = ''; desenharGrade(); },
      }, el('img', { src, alt: '' }))),
      opcaoPropria);
    opcaoPropria.classList.toggle('escolhido', !!fotoPropria && foto === fotoPropria);
    opcaoPropria.replaceChildren(fotoPropria
      ? el('img', { src: fotoPropria, alt: '' })
      : el('span', { class: 'avatar-propria-texto' }, icone('upload', 26), 'Sua foto'));
  }
  opcaoPropria.addEventListener('click', () => {
    if (fotoPropria && foto !== fotoPropria) { foto = fotoPropria; desenharGrade(); return; }
    entradaArquivo.click();
  });
  entradaArquivo.addEventListener('change', async () => {
    try {
      fotoPropria = await prepararFoto(entradaArquivo.files[0]);
      foto = fotoPropria; desenharGrade();
    } catch (e) { erro.textContent = e.message; }
    entradaArquivo.value = '';
  });
  desenharGrade();

  const botao = el('button', { class: 'btn btn-ouro btn-grande', type: 'submit' }, 'Começar');
  const form = el('form', {
    class: 'cartao avatar-cartao',
    onsubmit: async (ev) => {
      ev.preventDefault();
      erro.textContent = '';
      if (nome.value.trim().length < 2) { erro.textContent = 'Escreva um nome com pelo menos 2 letras.'; nome.focus(); return; }
      if (!foto) { erro.textContent = 'Escolha uma das fotos ou envie a sua.'; return; }
      botao.disabled = true;
      try {
        await rpc('comecar', { p_token: token(), p_nome: nome.value, p_foto: foto });
        await atualizar();
      } catch (e) { erro.textContent = e.message; botao.disabled = false; }
    },
  },
  el('h1', { class: 'titulo-secao' }, 'Seu avatar'),
  el('label', { class: 'rotulo', for: 'nome' }, 'Nome'), nome,
  el('p', { class: 'rotulo' }, 'Foto'), grade, entradaArquivo,
  erro, botao);

  return { raiz: el('main', { class: 'tela-centro' }, marca('pequena'), form) };
}

// ---------------------------------------------------------------------
// Sala de espera
// ---------------------------------------------------------------------
function telaEspera() {
  const lista = el('div', { class: 'espera-lista' });
  const contagem = el('p', { class: 'espera-contagem' });
  let ativo = true;

  async function carregar() {
    if (!ativo || !estado.sala) return;
    try {
      const js = await rpc('jogadores_sala', { p_sala: estado.sala.id });
      const prontos = js.filter((j) => j.pronto).length;
      contagem.textContent = `${prontos} de ${js.length} prontos`;
      lista.replaceChildren(...js.map((j) => el('div', { class: 'espera-jogador' + (j.id === estado.eu?.id ? ' sou-eu' : '') },
        el('img', { src: j.pronto ? fotoSrc(j.foto) : AVATARES[0], alt: '', class: j.pronto ? '' : 'apagado' }),
        el('strong', {}, j.pronto ? j.nome : 'Escolhendo avatar…'),
        el('span', { class: 'chip ' + (j.pronto ? 'chip-ok' : 'chip-espera') }, j.pronto ? 'Pronto' : 'Escolhendo'))));
    } catch { /* tenta de novo no próximo aviso */ }
  }

  const raiz = el('main', { class: 'tela-centro' }, marca('pequena'),
    el('section', { class: 'cartao espera-cartao' },
      el('h1', { class: 'titulo-secao' }, 'Sala de espera'),
      el('p', { class: 'texto-suave' }, 'A partida começa quando todos apertarem “Começar” (mínimo de 2 jogadores).'),
      contagem, lista,
      el('button', {
        class: 'btn btn-fantasma',
        onclick: async () => {
          try { await rpc('editar_avatar', { p_token: token() }); await atualizar(); } catch (e) { toast(e.message, 'erro'); }
        },
      }, 'Trocar nome ou foto')));
  return { raiz, atualizar: carregar, desmontar: () => { ativo = false; } };
}

// ---------------------------------------------------------------------
// Partida: instruções (uma vez), faixa de nova rodada e tela principal
// ---------------------------------------------------------------------
function telaJogo() {
  const principal = criarPrincipal({ token, atualizarTudo: atualizar });
  const raiz = principal.raiz;
  let chaveInstr = null, esperaNoticias = null;

  function verAvisos() {
    const sala = estado.sala;
    chaveInstr = `milionario.instr.${sala.id}`;
    if (!localStorage.getItem(chaveInstr)) {
      if (document.querySelector('.modal-instrucoes')) return;
      mostrarInstrucoes(sala, () => { localStorage.setItem(chaveInstr, '1'); verAvisos(); });
      return;
    }
    const chaveFaixa = `milionario.faixa.${sala.id}`;
    const vista = Number(localStorage.getItem(chaveFaixa) || 0);
    const chaveNot = `milionario.noticias.${sala.id}`;
    const lidas = Number(localStorage.getItem(chaveNot) || 0);
    const verNoticias = () => principal.abrirNovidades('noticias', () => localStorage.setItem(chaveNot, String(sala.rodada)));
    if (sala.rodada > vista) {
      localStorage.setItem(chaveFaixa, String(sala.rodada));
      faixaRodada(sala.rodada);
      clearTimeout(esperaNoticias);
      esperaNoticias = setTimeout(() => { esperaNoticias = null; verNoticias(); }, 2700);
    } else if (sala.rodada > lidas && !esperaNoticias && !document.querySelector('.modal-fundo')) {
      verNoticias();
    }
  }

  return {
    raiz,
    atualizar: (est) => { principal.atualizar(est); verAvisos(); },
    desmontar: principal.desmontar,
  };
}

function mostrarInstrucoes(sala, depois) {
  modal({
    titulo: 'Bem-vindo a Neópolis', classe: 'modal-instrucoes', fecharFora: false,
    conteudo: textoInstrucoes(sala),
    botoes: [{ texto: 'Entendi', classe: 'btn-ouro', acao: (f) => { f(); depois(); } }],
  });
}

function faixaRodada(n) {
  const f = el('div', { class: 'faixa-rodada', role: 'status' },
    n > 1 ? el('span', { class: 'faixa-fim' }, `${n - 1}ª rodada terminada`) : null,
    el('span', { class: 'faixa-pre' }, 'Início da'),
    el('strong', {}, `${n}ª Rodada`));
  document.body.append(f);
  setTimeout(() => f.classList.add('saindo'), 2300);
  setTimeout(() => f.remove(), 2900);
}

// ---------------------------------------------------------------------
setInterval(atualizar, 4000);
setInterval(() => { if (token()) rpc('sinal', { p_token: token() }).catch(() => {}); }, 12000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizar(); });
if (token()) rpc('sinal', { p_token: token() }).catch(() => {});
atualizar();
